import * as vscode from 'vscode';
import { StyleSymbol } from '../types/StyleSymbol';
import { parseStylus } from './parseStylus';

export class StyleCacheManager {
    // 파일 URI 문자열을 키로 사용하는 캐시 저장소
    private cache = new Map<string, StyleSymbol[]>();

    private normalizePath(uri: vscode.Uri): string {
        return uri.fsPath.toLowerCase();
    }

    /**
     * 특정 파일의 캐시를 갱신하거나 새로 생성합니다.
     */
    public async updateCache(uri: vscode.Uri, force:boolean = false): Promise<void> {
        const uriStr = this.normalizePath(uri);
        if (!force && this.cache.has(uriStr)) return;

        try {
            // 파일을 에디터로 열지 않고 바이너리로 직접 읽어서 처리 (성능 최적화)
            const fileData = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileData).toString('utf8');
            const symbols = parseStylus(content);
            this.cache.set(uriStr, symbols);
        } catch (e) {
            console.error(`[Cache Error] ${uri.fsPath}`, e);
        }
    }

    /**
     * 특정 파일의 캐시를 삭제(무효화)합니다.
     */
    public invalidateCache(uri: vscode.Uri): void {
        const uriStr = this.normalizePath(uri);
        this.cache.delete(uriStr);
        console.log(`[Cache] Invalidated: ${uri.fsPath}`);
    }

    /**
     * 현재 캐시된 모든 파일에서 타겟 셀렉터를 찾습니다.
     */
    public findInCache(target: string): { uri: vscode.Uri, symbol: StyleSymbol } | null {
        for (const [cachedPath, symbols] of this.cache) { // key 이름도 cachedPath로 바꾸면 더 직관적이죠
            const found = symbols.find(s => s.fullSelector === `.${target}` || s.fullSelector === target);
            if (found) {
                return {
                    uri: vscode.Uri.file(cachedPath),
                    symbol: found
                };
            }
        }
        return null;
    }

    /**
     * 특정 폴더(workspaceFolder) 내에 있는 캐시만 검색
     */
    public findInFolder(target: string, folderUri: vscode.Uri) {
        const folderPath = this.normalizePath(folderUri);

        for (const [cachedPath, symbols] of this.cache) {
            if (cachedPath.startsWith(folderPath)) {
                const found = symbols.find(s => s.fullSelector === `.${target}` || s.fullSelector === target);
                if (found) {
                    return { 
                        uri: vscode.Uri.file(cachedPath), 
                        symbol: found 
                    };
                }
            }
        }
        return null;
    }
}