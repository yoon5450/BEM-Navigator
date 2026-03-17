import * as vscode from "vscode";
import { StyleSymbol } from "../types/StyleSymbol";
import { parseStylus } from "./parseStylus";
import * as path from "path";
import * as fs from "fs";

export class StyleCacheManager {
  // 파일 URI 문자열을 키로 사용하는 캐시 저장소
  private cache = new Map<
    string,
    { uri: vscode.Uri; symbols: StyleSymbol[] }
  >();
  // 해당 프로젝트 루트 정보를 가지는 캐시 저장소
  private rootCache = new Map<string, string>();

  private normalizePath(pathOrUri: string | vscode.Uri): string {
    const pathStr =
      typeof pathOrUri === "string" ? pathOrUri : pathOrUri.toString();
    return pathStr.toLowerCase();
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

      this.cache.set(uriStr, { uri, symbols });
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
    for (const [_, data] of this.cache) {
      // key 이름도 cachedPath로 바꾸면 더 직관적이죠
      const found = data.symbols.find(
        (s) => s.fullSelector === `.${target}` || s.fullSelector === target,
      );
      if (found) {
        return {
          uri: data.uri,
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
  public findInFolder(
    target: string,
    currentDocUri: vscode.Uri,
  ): { uri: vscode.Uri; symbol: StyleSymbol; score: number }[] {
    const currentPath = this.normalizePath(currentDocUri);
    const currentProjectRoot = this.getActualProjectRoot(currentDocUri);
    const targetSelector =
      target.startsWith(".") || target.startsWith("#") ? target : `.${target}`;

    console.log(`🏠 [Context] Root: ${currentProjectRoot}`);

    let matches: {
      uri: vscode.Uri;
      symbol: StyleSymbol;
      score: number;
    }[] = [];

    let projectFileCount = 0;

    for (const [_, data] of this.cache) {
      const cachedPath = this.normalizePath(data.uri);
      const cachedFileRoot = this.getActualProjectRoot(data.uri);

      // [Step 1] 프로젝트 루트 필터링
      if (cachedFileRoot !== currentProjectRoot) {
        continue;
      }

      projectFileCount++;

      // [Step 2] 매칭 시도
      const foundSymbols = data.symbols.filter((s) => {
        return (
          s.fullSelector === targetSelector ||
          s.fullSelector.endsWith(" " + targetSelector)
        );
      });

      if (foundSymbols.length > 0) {
        for (const symbol of foundSymbols) {
          const distance = this.calculateDistance(currentPath, cachedPath);
          const purityBonus = symbol.fullSelector === targetSelector ? 0 : 10;
          const totalScore = distance + purityBonus;

          console.log(
            `[Match] ${path.basename(cachedPath)} | Score: ${totalScore} (Dist: ${distance}, Purity: ${purityBonus}) | Selector: ${symbol.fullSelector}`,
          );

          matches.push({
            uri: data.uri,
            symbol: symbol,
            score: totalScore,
          });
        }
      }
    }

    // [Step 3] 최종 결과 로그
    console.log(
      `📊 [Summary] Total files in project: ${projectFileCount}, Matches found: ${matches.length}`,
    );

    const sortedMatches = matches.sort((a, b) => a.score - b.score);

    if (sortedMatches.length > 0) {
      console.log(
        `🏆 [Best] ${path.basename(sortedMatches[0].uri.fsPath)} (${sortedMatches[0].score} pts)`,
      );
    } else {
      console.log(`❌ [Result] No matches found within the same project root.`);
    }

    return sortedMatches;
  }

  /**
   * 자동완성을 위해 현재 프로젝트의 모든 캐시된 클래스 목록을 반환합니다.
   */
  public getCompletionItems(
    currentDocUri: vscode.Uri,
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const uniqueClasses = new Set<string>();
    const currentProjectRoot = this.getActualProjectRoot(currentDocUri);

    for (const [_, data] of this.cache) {
      if (this.getActualProjectRoot(data.uri) !== currentProjectRoot) continue;

      for (const symbol of data.symbols) {
        // 띄어쓰기가 포함된 자손 선택자일 경우 마지막 클래스명만 추출 (예: ".calc .calc-popup" -> ".calc-popup")
        const parts = symbol.fullSelector.split(" ");
        const lastSelector = parts[parts.length - 1];
        const className = lastSelector.replace(/^[.#]/, "");
        if (!uniqueClasses.has(className)) {
          uniqueClasses.add(className);
          const item = new vscode.CompletionItem(
            className,
            vscode.CompletionItemKind.Class,
          );
          item.detail = "BEM (External)";
          items.push(item);
        }
      }
    }
    return items;
  }

  /**
   * 두 파일 경로 사이의 물리적 거리를 계산합니다.
   * 점수가 낮을수록 두 파일은 같은 폴더 혹은 인접 폴더에 있습니다.
   */
  private calculateDistance(fromPath: string, toPath: string): number {
    const fromParts = fromPath.split(/[\\/]/);
    const toParts = toPath.split(/[\\/]/);

    let commonIndex = 0;
    while (
      commonIndex < fromParts.length &&
      commonIndex < toParts.length &&
      fromParts[commonIndex] === toParts[commonIndex]
    ) {
      commonIndex++;
    }

    return fromParts.length - commonIndex + (toParts.length - commonIndex);
  }
  // src/utils/styleCacheManager.ts

  private getActualProjectRoot(uri: vscode.Uri): string {
    const uriStr = this.normalizePath(uri);
    const dirPath = path.dirname(uriStr);

    if (this.rootCache.has(dirPath)) return this.rootCache.get(dirPath)!;

    // VSCode API를 사용하여 워크스페이스 폴더를 루트로 사용 (가장 확실한 방법)
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    const root = folder ? this.normalizePath(folder.uri) : dirPath;

    this.rootCache.set(dirPath, root);
    return root;
  }
}
