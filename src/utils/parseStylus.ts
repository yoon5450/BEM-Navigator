import { StyleSymbol } from "../types/StyleSymbol";


export function parseStylus(content: string): StyleSymbol[] {
    const symbols: StyleSymbol[] = [];
    const stack: { indent: number, selector: string }[] = [];
    const lines = content.split('\n');

    lines.forEach((lineText, index) => {
        const indent = lineText.search(/\S/); // 첫 번째 공백이 아닌 문자의 위치
        if (indent === -1) return; // 빈 줄 스킵

        let currentSelector = lineText.trim().split(/[ {]/)[0];
        
        if (currentSelector.includes(':') && !currentSelector.startsWith('&')) return;

        // 1. 현재 인덴트보다 깊거나 같은 이전 스택 제거
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        // 2. BEM 결합(&) 처리
        const parent = stack[stack.length - 1];
        if (currentSelector.startsWith('&') && parent) {
            currentSelector = parent.selector + currentSelector.slice(1);
        }

        // 3. 스택에 추가 및 결과 저장
        stack.push({ indent, selector: currentSelector });
        symbols.push({
            fullSelector: currentSelector,
            line: index,
            character: indent
        });
    });

    return symbols;
}