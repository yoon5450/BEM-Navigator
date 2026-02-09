import * as vscode from "vscode";
import { StyleSymbol } from "../types/StyleSymbol";
import { parseStylus } from "./parseStylus";
import * as path from "path";

export class StyleCacheManager {
  // 파일 URI 문자열을 키로 사용하는 캐시 저장소
  private cache = new Map<string, StyleSymbol[]>();

  private normalizePath(uri: vscode.Uri): string {
    return uri.fsPath.toLowerCase();
  }

  /**
   * 특정 파일의 캐시를 갱신하거나 새로 생성합니다.
   */
  public async updateCache(
    uri: vscode.Uri,
    force: boolean = false,
  ): Promise<void> {
    const uriStr = this.normalizePath(uri);
    if (!force && this.cache.has(uriStr)) return;

    try {
      const fileData = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(fileData).toString("utf8");
      const symbols = parseStylus(content);

      this.cache.set(uriStr, symbols);
      // 로그를 찍어서 실제로 파일이 캐싱되는지 확인하세요!
      console.log(`[Cache] Indexed: ${uriStr} (${symbols.length} symbols)`);
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
  public findInCache(
    target: string,
  ): { uri: vscode.Uri; symbol: StyleSymbol } | null {
    for (const [cachedPath, symbols] of this.cache) {
      // key 이름도 cachedPath로 바꾸면 더 직관적이죠
      const found = symbols.find(
        (s) => s.fullSelector === `.${target}` || s.fullSelector === target,
      );
      if (found) {
        return {
          uri: vscode.Uri.file(cachedPath),
          symbol: found,
        };
      }
    }
    return null;
  }

  /**
   * 특정 폴더(workspaceFolder) 내에 있는 캐시만 검색하되,
   * 현재 파일과 가장 가까운 경로를 우선적으로 탐색합니다.
   */
  public findInFolder(target: string, folderUri: vscode.Uri) {
    const targetPath = this.normalizePath(folderUri);
    const targetSelector =
      target.startsWith(".") || target.startsWith("#") ? target : `.${target}`;

    for (const [cachedPath, symbols] of this.cache) {
      // 경로 구분자 문제를 피하기 위해 normalize된 경로로 비교
      if (cachedPath.includes(targetPath)) {
        const found = symbols.find((s) => {
          // 1. 완전 일치 (ex: .loading-spinner)
          if (s.fullSelector === targetSelector) return true;

          // 2. 자식 선택자로 중첩된 경우 (ex: .parent .loading-spinner)
          // 공백 뒤에 타겟이 붙어있는지 확인
          if (s.fullSelector.endsWith(" " + targetSelector)) return true;

          // 3. BEM 결합자로 중첩된 경우 (ex: .apply + __loading-container)
          // 부모랑 딱 붙어있는 경우를 위해 endsWith 체크
          if (s.fullSelector.endsWith(targetSelector)) return true;

          return false;
        });
        if (found) return { uri: vscode.Uri.file(cachedPath), symbol: found };
      }
    }
    return null;
  }
}
