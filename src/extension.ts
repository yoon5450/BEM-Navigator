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

  // 1. 상태 표시줄 아이템 생성
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(sync~spin) BEM: 인덱싱 중...";
  statusBarItem.show();

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const folder = vscode.workspace.getWorkspaceFolder(
      activeEditor.document.uri,
    );
    if (folder) {
      const currentDir = new vscode.RelativePattern(folder, "**/*.styl");
      const excludeDir = new vscode.RelativePattern(
        folder,
        "**/node_modules/**",
      );
      const priorityFiles = await vscode.workspace.findFiles(
        currentDir,
        excludeDir,
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
  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length === 0) {
    statusBarItem.hide();
  }
  const indexingPromises = folders.map((folder) => {
    const pattern = new vscode.RelativePattern(folder, "**/*.styl");
    const excludePattern = new vscode.RelativePattern(
      folder,
      "**/node_modules/**",
    );

    return vscode.workspace
      .findFiles(pattern, excludePattern)
      .then(async (files) => {
        console.log(`📂 [${folder.name}] 검색된 총 파일 수: ${files.length}`);

        // EMFILE 에러 방지 및 캐싱 속도 향상을 위해 50개씩 병렬(Chunk) 처리
        const chunkSize = 50;
        for (let i = 0; i < files.length; i += chunkSize) {
          const chunk = files.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map((file) => cacheManager.updateCache(file)),
          );
        }

        console.log(`✅ [${folder.name}] 백그라운드 인덱싱 완료!`);
      });
  });

  // 모든 워크스페이스의 인덱싱이 끝나면 상태 표시줄 업데이트
  Promise.all(indexingPromises).then(() => {
    statusBarItem.text = "$(check) BEM: 인덱싱 완료";
    // 3초 후 상태 표시줄 숨김
    setTimeout(() => {
      statusBarItem.hide();
    }, 3000);
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

        vscode.window.showInformationMessage(
          `'${target}' 정의를 찾을 수 없습니다.`,
        );
        return null;
      },
    },
  );

  context.subscriptions.push(provider);
  context.subscriptions.push(statusBarItem);

  // 2. Hover Provider 등록 (마우스 오버 미리보기)
  const hoverProvider = vscode.languages.registerHoverProvider(
    ["vue", "pug", "html"],
    {
      provideHover(document, position, token) {
        const range = getBemRange(document, position);
        if (!range) return null;

        const rawTarget = document.getText(range);
        const target = rawTarget.replace(/^[.#]/, "");

        // 1) 문서 내 캐시에서 먼저 찾기
        if (
          documentCache &&
          documentCache.uri === document.uri.toString() &&
          documentCache.version === document.version
        ) {
          for (const { symbols } of documentCache.styles) {
            const found = symbols.find(
              (s) =>
                s.fullSelector === `.${target}` || s.fullSelector === target,
            );
            if (found) {
              const markdown = new vscode.MarkdownString();
              markdown.appendMarkdown(`💡 **BEM Navigator**\n\n`);
              markdown.appendCodeblock(found.fullSelector, "stylus");
              markdown.appendMarkdown(`\n📂 *Current File (<style> block)*`);
              return new vscode.Hover(markdown, range);
            }
          }
        }

        // 2) 외부 파일 캐시 매니저에서 찾기
        const cachedResults = cacheManager.findInFolder(target, document.uri);
        if (cachedResults && cachedResults.length > 0) {
          // 가장 거리가 가깝고 점수가 높은(Best Match) 1개만 표시
          const bestMatch = cachedResults[0];

          const markdown = new vscode.MarkdownString();
          markdown.appendMarkdown(`💡 **BEM Selector**\n\n`);
          markdown.appendCodeblock(bestMatch.symbol.fullSelector, "stylus");

          // 워크스페이스 상대 경로 추출 (보기 좋게 다듬기)
          const workspaceFolder = vscode.workspace.getWorkspaceFolder(
            bestMatch.uri,
          );
          const relativePath = workspaceFolder
            ? vscode.workspace.asRelativePath(bestMatch.uri, false)
            : bestMatch.uri.fsPath;

          markdown.appendMarkdown(
            `\n📂 \`${relativePath}\` (Line: ${bestMatch.symbol.line + 1})`,
          );

          // (선택 사항) 클릭하면 해당 파일로 바로 이동하는 커맨드 링크 추가
          markdown.isTrusted = true;
          const args = encodeURIComponent(
            JSON.stringify([
              bestMatch.uri,
              {
                selection: new vscode.Range(
                  bestMatch.symbol.line,
                  0,
                  bestMatch.symbol.line,
                  0,
                ),
              },
            ]),
          );
          markdown.appendMarkdown(`\n\n$(go-to-file) 파일 열기`);

          return new vscode.Hover(markdown, range);
        }

        return null;
      },
    },
  );

  context.subscriptions.push(hoverProvider);

  // 3. 자동완성 (Completion Provider) 등록
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    ["vue", "pug", "html"],
    {
      provideCompletionItems(document, position) {
        // 1) 외부 파일 캐시에서 중복 제거된 전체 클래스 목록 가져오기
        const items = cacheManager.getCompletionItems(document.uri);

        // 2) 현재 파일 내부의 <style> 캐시도 병합
        if (
          documentCache &&
          documentCache.uri === document.uri.toString() &&
          documentCache.version === document.version
        ) {
          for (const { symbols } of documentCache.styles) {
            for (const s of symbols) {
              const parts = s.fullSelector.split(" ");
              const lastSelector = parts[parts.length - 1];
              const className = lastSelector.replace(/^[.#]/, "");
              const item = new vscode.CompletionItem(
                className,
                vscode.CompletionItemKind.Class,
              );
              item.detail = "BEM (Current File)";
              items.push(item);
            }
          }
        }

        // 생성된 전체 목록을 반환하면, VS Code가 사용자의 타이핑에 맞춰 초고속 필터링을 수행합니다.
        return items;
      },
    },
    ".",
    '"',
    "'",
    " ", // Trigger Characters: 이 문자들을 입력할 때 즉시 자동완성 창을 띄웁니다.
  );

  context.subscriptions.push(completionProvider);
}
