import * as vscode from 'vscode';
import { StyleSymbol } from '../types/StyleSymbol';
import { parseStylus } from './parseStylus';

export class StyleCacheManager {
    // 파일 URI 문자열을 키로 사용하는 캐시 저장소
    private cache = new Map<string, StyleSymbol[]>();

    /**
     * 특정 파일의 캐시를 갱신하거나 새로 생성합니다.
     */
    public async updateCache(uri: vscode.Uri, force:boolean = false): Promise<void> {
        const uriStr = uri.toString();
        if (!force && this.cache.has(uriStr)) return;

        try {
            // 파일을 에디터로 열지 않고 바이너리로 직접 읽어서 처리 (성능 최적화)
            const fileData = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileData).toString('utf8');
            const symbols = parseStylus(content);
            this.cache.set(uri.toString(), symbols);
        } catch (e) {
            console.error(`[Cache Error] ${uri.fsPath}`, e);
        }
    }

    /**
     * 특정 파일의 캐시를 삭제(무효화)합니다.
     */
    public invalidateCache(uri: vscode.Uri): void {
        this.cache.delete(uri.toString());
        console.log(`[Cache] Invalidated: ${uri.fsPath}`);
    }

    /**
     * 현재 캐시된 모든 파일에서 타겟 셀렉터를 찾습니다.
     */
    public findInCache(target: string): { uri: vscode.Uri, symbol: StyleSymbol } | null {
        for (const [uriStr, symbols] of this.cache) {
            const found = symbols.find(s => s.fullSelector === `.${target}` || s.fullSelector === target);
            if (found) {
                return {
                    uri: vscode.Uri.parse(uriStr),
                    symbol: found
                };
            }
        }
        return null;
    }

    /**
     * 특정 폴더(workspaceFolder) 내에 있는 캐시만 검색
     */
    public findInFolder(target: string, folderUri: vscode.Uri): { uri: vscode.Uri, symbol: StyleSymbol } | null {
        const folderPath = folderUri.toString();

        for (const [uriStr, symbols] of this.cache) {
            // 캐시된 파일의 경로가 현재 작업 중인 폴더 경로로 시작하는지 확인
            if (uriStr.startsWith(folderPath)) {
                const found = symbols.find(s => s.fullSelector === `.${target}` || s.fullSelector === target);
                if (found) {
                    return { uri: vscode.Uri.parse(uriStr), symbol: found };
                }
            }
        }
        return null;
    }
}