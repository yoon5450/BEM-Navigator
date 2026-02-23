// src/extension.ts
import * as vscode from "vscode";
import { parseStylus } from "./utils/parseStylus";
import { StyleCacheManager } from "./utils/styleCacheManager";
import { getBemRange } from "./utils/getBemRange";
import { StyleSymbol } from "./types/StyleSymbol";

// 현재 문서의 파싱 결과를 캐싱하기 위한 변수
// NOTE: 같은 파일 내부 탐색은 연산부하가 높지 않으므로, 문제 발생할 시 제거
let documentCache: {
  uri: string;
  version: number;
  styles: { symbols: StyleSymbol[]; offset: number }[];
} | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log("🚀 BEM-Navigator 활성화됨");
  const cacheManager = new StyleCacheManager();

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const folder = vscode.workspace.getWorkspaceFolder(
      activeEditor.document.uri,
    );
    if (folder) {
      const currentDir = new vscode.RelativePattern(folder, "**/*.styl");
      const priorityFiles = await vscode.workspace.findFiles(
        currentDir,
        "**/node_modules/**",
        10,
      );
      for (const file of priorityFiles) {
        await cacheManager.updateCache(file);
      }
    }
  }

  // 새 탭이 열릴 때마다 캐시 업데이트
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === "stylus" || doc.fileName.endsWith(".styl")) {
        cacheManager.updateCache(doc.uri);
      }
    }),
  );

  // 파일 감시자 설정
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.styl");

  watcher.onDidChange((uri) => cacheManager.updateCache(uri, true));
  watcher.onDidCreate((uri) => cacheManager.updateCache(uri, true));
  watcher.onDidDelete((uri) => cacheManager.invalidateCache(uri));

  context.subscriptions.push(watcher);

  // 심볼릭 고려
  // 프로젝트 폴더별로 src/style, styles 내 파일들을 백그라운드 인덱싱
  vscode.workspace.workspaceFolders?.forEach((folder) => {
    const pattern = new vscode.RelativePattern(folder, "**/*.styl");

    vscode.workspace
      .findFiles(pattern, "**/node_modules/**")
      .then(async (files) => {
        console.log(`📂 [${folder.name}] 검색된 총 파일 수: ${files.length}`);

        for (const file of files) {
          cacheManager.updateCache(file);
        }
      });
  });

  const provider = vscode.languages.registerDefinitionProvider(
    ["vue", "pug", "html"],
    {
      async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
      ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        // 프로젝트 경로 가져옴
        console.log(`현재 캐시된 파일 개수: ${cacheManager["cache"].size}`);
        const currentFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!currentFolder) return null;

        // 해당 pug 스타일 파일의 BEM 스타일 위치를 가져옴
        const range = getBemRange(document, position);

        if (!range) {
          console.log("단어 범위를 찾지 못함");
          return null;
        }

        const rawTarget = document.getText(range);
        console.log(`추출된 전체 텍스트: ${rawTarget}`);
        const target = rawTarget.replace(/^[.#]/, "");
        console.log(`찾는 대상: [${target}]`);

        // 1. 현재 파일 파싱 (캐시 활용)
        let parsedStyles: { symbols: StyleSymbol[]; offset: number }[] = [];

        if (
          documentCache &&
          documentCache.uri === document.uri.toString() &&
          documentCache.version === document.version
        ) {
          parsedStyles = documentCache.styles;
        } else {
          const text = document.getText();
          const styleRegex =
            /<style[^>]*lang="stylus"[^>]*>([\s\S]*?)<\/style>/g;
          let match;
          while ((match = styleRegex.exec(text)) !== null) {
            const styleContent = match[1];
            const styleStartOffset =
              match.index + match[0].indexOf(styleContent);
            const symbols = parseStylus(styleContent);
            parsedStyles.push({ symbols, offset: styleStartOffset });
          }
          // 파싱 결과 캐싱 (버전 정보 포함)
          documentCache = {
            uri: document.uri.toString(),
            version: document.version,
            styles: parsedStyles,
          };
        }

        // 캐시된(혹은 새로 파싱된) 결과에서 심볼 탐색
        for (const { symbols, offset } of parsedStyles) {
          const found = symbols.find(
            (s) => s.fullSelector === `.${target}` || s.fullSelector === target,
          );
          if (found) {
            const startPos = document.positionAt(offset);
            const p = new vscode.Position(
              startPos.line + found.line,
              found.character,
            );
            const r = new vscode.Range(p, p);
            return [
              {
                targetUri: document.uri,
                targetRange: r,
                targetSelectionRange: r,
                originSelectionRange: range,
              },
            ];
          }
        }

        // 2. 캐시 매니저를 통해 외부 파일 탐색
        const cachedResults = cacheManager.findInFolder(target, document.uri);

        if (cachedResults && cachedResults.length > 0) {
          return cachedResults.map((res) => {
            const line =
              typeof res.symbol.line === "number" ? res.symbol.line : 0;
            const char =
              typeof res.symbol.character === "number"
                ? res.symbol.character
                : 0;

            const targetPos = new vscode.Position(line, char);
            const targetRange = new vscode.Range(targetPos, targetPos);

            return {
              originSelectionRange: range,
              targetUri: res.uri,
              targetRange: targetRange,
              targetSelectionRange: targetRange,
            };
          });
        }
        return null;
      },
    },
  );

  context.subscriptions.push(provider);
}
