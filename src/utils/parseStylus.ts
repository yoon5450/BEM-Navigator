import { StyleSymbol } from "../types/StyleSymbol";

export function parseStylus(content: string): StyleSymbol[] {
  const symbols: StyleSymbol[] = [];
  const stack: { indent: number; selector: string }[] = [];
  const lines = content.split("\n");

  lines.forEach((lineText, index) => {
    const indent = lineText.search(/\S/);
    if (indent === -1) return;

    const trimmed = lineText.trim();

    // 1. 스타일 속성 제외 (간단한 휴리스틱: 콜론이 있고, &로 시작하지 않는 경우)
    // Stylus는 콜론 없이도 속성을 쓸 수 있지만, 보통 BEM은 클래스 위주이므로 .이나 &을 체크
    if (trimmed.includes(":") && !trimmed.startsWith("&")) return;

    // 2. 클래스나 BEM 결합자(&)가 아닌 일반 텍스트 속성 거르기
    // (예: margin 0, padding 10 등 선택자가 아닌 경우 스킵)
    if (
      !trimmed.startsWith(".") &&
      !trimmed.startsWith("&") &&
      !trimmed.startsWith("#")
    ) {
      // 프로젝트 컨벤션에 따라 태그 선택자(div, span)도 포함하려면 이 조건은 조정 필요
      if (indent > 0) return;
    }

    // 선택자 추출 (공백이나 중괄호 전까지)
    let currentSelector = trimmed.split(/[ {]/)[0];

    // 스택 관리
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    let fullSelector = currentSelector;

    if (currentSelector.startsWith("&") && parent) {
      // & 결합: 부모의 fullSelector 뒤에 &를 뗀 나머지를 붙임
      fullSelector = parent.selector + currentSelector.slice(1);
    } else if (parent) {
      // 단순 중첩: 부모 선택자 아래의 자식 선택자 (예: .parent .child)
      fullSelector = `${parent.selector} ${currentSelector}`;
    }

    stack.push({ indent, selector: fullSelector });
    symbols.push({
      fullSelector,
      line: index,
      character: indent,
    });
  });

  return symbols;
}
