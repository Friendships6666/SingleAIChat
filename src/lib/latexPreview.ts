import katex from 'katex';
import { HtmlGenerator, parse } from 'latex.js';

const assetBase = 'https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/';
const katexCss = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';

export function renderLatex(code: string): string {
  if (!/\\(?:documentclass|begin\s*\{document\})/.test(code)) {
    const math = katex.renderToString(code, { displayMode: true, throwOnError: true });
    return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${katexCss}"><style>body{margin:0;padding:24px;overflow:auto}</style></head><body>${math}</body></html>`;
  }
  const generator = new HtmlGenerator({ hyphenate: false });
  parse(code, { generator });
  return '<!doctype html>' + generator.htmlDocument(assetBase).documentElement.outerHTML;
}
