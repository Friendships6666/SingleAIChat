import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
import 'markdown-it-texmath/css/texmath.css';
import 'highlight.js/styles/atom-one-dark.min.css';

const md: MarkdownIt = new MarkdownIt({
  html: true, breaks: true, linkify: true,
  highlight(str, lang): string {
    const language = md.utils.escapeHtml(lang || '');
    if (lang && hljs.getLanguage(lang)) {
      try { return `<pre class="hljs" data-language="${language}"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`; }
      catch { /* Fall back to escaped text. */ }
    }
    return `<pre class="hljs" data-language="${language}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
}).use(texmath, { engine: katex, delimiters: ['dollars', 'brackets', 'beg_end'], katexOptions: { throwOnError: false } });

export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(md.render(text));
}
