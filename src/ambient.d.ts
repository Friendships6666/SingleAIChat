declare module 'markdown-it-texmath';
declare module 'dompurify';
declare module 'latex.js' {
  export class HtmlGenerator {
    constructor(options?: { hyphenate?: boolean });
    htmlDocument(baseUrl?: string): Document;
  }
  export function parse(source: string, options: { generator: HtmlGenerator }): unknown;
}
