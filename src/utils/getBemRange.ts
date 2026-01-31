import * as vscode from 'vscode';

export const getBemRange = (doc: vscode.TextDocument, pos: vscode.Position) => {
    const line = doc.lineAt(pos.line).text;
    const isBody = (ch: string) => /[A-Za-z0-9_-]/.test(ch);
    let i = pos.character;
    if (i >= line.length) i = line.length - 1;
    if (i < 0) return null;
    if (!isBody(line[i])) {
        let l = i - 1;
        let r = i + 1;
        while (l >= 0 || r < line.length) {
            if (l >= 0 && isBody(line[l])) { i = l; break; }
            if (r < line.length && isBody(line[r])) { i = r; break; }
            l--; r++;
        }
        if (!isBody(line[i])) return null;
    }
    let start = i;
    while (start - 1 >= 0 && isBody(line[start - 1])) start--;
    let end = i;
    while (end + 1 < line.length && isBody(line[end + 1])) end++;
    if (start - 1 >= 0 && (line[start - 1] === '.' || line[start - 1] === '#')) start--;
    return new vscode.Range(
        new vscode.Position(pos.line, start),
        new vscode.Position(pos.line, end + 1)
  );
};