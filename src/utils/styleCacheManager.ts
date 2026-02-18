import * as vscode from "vscode";
import { StyleSymbol } from "../types/StyleSymbol";
import { parseStylus } from "./parseStylus";
import * as path from "path";
import * as fs from "fs";

export class StyleCacheManager {
  // 파일 URI 문자열을 키로 사용하는 캐시 저장소
  private cache = new Map<string, StyleSymbol[]>();

  private normalizePath(pathOrUri: string | vscode.Uri): string {
    const path = typeof pathOrUri === "string" ? pathOrUri : pathOrUri.fsPath;
    return path.toLowerCase().replace(/\\/g, "/");
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
  // src/utils/styleCacheManager.ts

  public findInFolder(
    target: string,
    currentDocUri: vscode.Uri,
  ): { uri: vscode.Uri; symbol: StyleSymbol; score: number }[] {
    const currentPath = this.normalizePath(currentDocUri.fsPath);
    const currentProjectRoot = this.getActualProjectRoot(currentPath);
    const targetSelector =
      target.startsWith(".") || target.startsWith("#") ? target : `.${target}`;

    console.log(`\n🔍 [Find] Target: "${targetSelector}"`);
    console.log(`📂 [Context] File: ${currentPath}`);
    console.log(`🏠 [Context] Root: ${currentProjectRoot}`);

    let matches: {
      uri: vscode.Uri;
      symbol: StyleSymbol;
      score: number;
    }[] = [];

    let projectFileCount = 0;

    for (const [originalCachedPath, symbols] of this.cache) {
      const cachedPath = this.normalizePath(originalCachedPath);
      const cachedFileRoot = this.getActualProjectRoot(cachedPath);

      // [Step 1] 프로젝트 루트 필터링 로그
      if (cachedFileRoot !== currentProjectRoot) {
        // 너무 노이즈가 심하면 주석 처리하세요. 다른 프로젝트 파일임을 알리는 로그입니다.
        // console.log(`⏩ [Skip] Different Root: ${cachedPath} (Root: ${cachedFileRoot})`);
        continue;
      }

      projectFileCount++;

      // [Step 2] 매칭 시도
      const foundSymbols = symbols.filter((s) => {
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
            `✅ [Match] ${path.basename(cachedPath)} | Score: ${totalScore} (Dist: ${distance}, Purity: ${purityBonus}) | Selector: ${symbol.fullSelector}`,
          );

          matches.push({
            uri: vscode.Uri.file(originalCachedPath),
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

  private getActualProjectRoot(filePath: string): string {
    let currentDir = path.dirname(this.normalizePath(filePath));
    const root = path.parse(currentDir).root;

    // 위로 올라가며 package.json을 찾되, 가장 먼저 발견되는 곳을 Root로 함
    while (currentDir !== root) {
      const packageJsonPath = path.join(currentDir, "package.json");

      if (fs.existsSync(packageJsonPath)) {
        // 찾았다! /users/yoon/mohaet-dup/web_solar_bank 같은 곳에서 멈춤
        return this.normalizePath(currentDir);
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    // package.json이 없는 경우를 대비한 Fallback -> 회사 디렉터리 구조에서만 유효.
    const parts = filePath.split("/");
    const webIndex = parts.findIndex((p) => p.startsWith("web"));
    if (webIndex !== -1) {
      return parts.slice(0, webIndex + 1).join("/");
    }

    return this.normalizePath(
      vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))?.uri
        .fsPath || currentDir,
    );
  }
}
