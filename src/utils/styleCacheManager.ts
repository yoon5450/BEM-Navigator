import * as vscode from 'vscode';
import { StyleSymbol } from '../types/StyleSymbol';
import { parseStylus } from './parseStylus';

export class StyleCacheManager {
    // 파일 URI 문자열을 키로 사용하는 캐시 저장소
    private cache = new Map<string, StyleSymbol[]>();

    /**
     * 특정 파일의 캐시를 갱신하거나 새로 생성합니다.
     */
    public async updateCache(uri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const symbols = parseStylus(document.getText());
            this.cache.set(uri.toString(), symbols);
            console.log(`[Cache] Updated: ${uri.fsPath}`);
        } catch (e) {
            console.error(`[Cache] Failed to update: ${uri.fsPath}`, e);
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
}