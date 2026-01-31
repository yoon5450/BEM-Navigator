// src/extension.ts
import * as vscode from 'vscode';
import { parseStylus } from './utils/parseStylus';
import { StyleCacheManager } from './utils/styleCacheManager';
import { getBemRange } from './utils/getBemRange';

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 BEM-Navigator 활성화됨');
    const cacheManager = new StyleCacheManager();

    // 열려 있는 탭부터 탐색
    const openTabs = vscode.workspace.textDocuments.filter(doc => doc.languageId === 'stylus' || doc.fileName.endsWith('.styl'));
    for (const doc of openTabs) {
        await cacheManager.updateCache(doc.uri);
    }

    // 새 탭이 열릴 때마다 캐시 업데이트
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'stylus' || doc.fileName.endsWith('.styl')) {
                cacheManager.updateCache(doc.uri);
            }
        })
    );

    // 파일 감시자 설정
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.styl');
    
    watcher.onDidChange(uri => cacheManager.updateCache(uri));
    watcher.onDidCreate(uri => cacheManager.updateCache(uri));
    watcher.onDidDelete(uri => cacheManager.invalidateCache(uri));

    const provider = vscode.languages.registerDefinitionProvider(
        ['vue', 'pug', 'html'],
        {
            async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition | vscode.LocationLink[] | null> {
                const range = getBemRange(document, position);
                
                if (!range) {
                    console.log('단어 범위를 찾지 못함');
                    return null;
                }

                const rawTarget = document.getText(range);
                console.log(`추출된 전체 텍스트: ${rawTarget}`);
                const target = rawTarget.replace(/^[.#]/, ''); 
                console.log(`찾는 대상: [${target}]`);

                const text = document.getText();
                const styleRegex = /<style[^>]*lang="stylus"[^>]*>([\s\S]*?)<\/style>/g;
                let match;
                
                // 1. 현재 파일에서 우선 탐색
                while ((match = styleRegex.exec(text)) !== null) {
                    if (token.isCancellationRequested) return null;
                    const styleContent = match[1];
                    const styleStartOffset = match.index + match[0].indexOf(styleContent);
                    const symbols = parseStylus(styleContent);
                    
                    const found = symbols.find(s => s.fullSelector === `.${target}` || s.fullSelector === target);
                    if (found) {
                        const startPos = document.positionAt(styleStartOffset);
                        const p = new vscode.Position(startPos.line + found.line, found.character);
                        const r = new vscode.Range(p, p);
                        return [{
                            targetUri: document.uri,
                            targetRange: r,
                            targetSelectionRange: r,
                            originSelectionRange: range,
                        }];
                    }
                }

                // 2. 캐시 매니저를 통해 외부 파일 탐색
                const cachedResult = cacheManager.findInCache(target);
                if (cachedResult) {
                    const { uri, symbol } = cachedResult;
                    const targetPos = new vscode.Position(symbol.line, symbol.character);
                    const targetRange = new vscode.Range(targetPos, targetPos);

                    return [{
                        originSelectionRange: range,
                        targetUri: uri,
                        targetRange: targetRange,
                        targetSelectionRange: targetRange
                    }];
                }

                return null;
            }
        }
    );

    context.subscriptions.push(provider);
}