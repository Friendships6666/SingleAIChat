import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { $typst } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import { detectPreviewKind, previewDocument } from '../src/lib/preview.ts';

test('detects previewable code and leaves ordinary code alone', () => {
  assert.equal(detectPreviewKind('<div>Hi</div>', 'html'), 'html');
  assert.equal(detectPreviewKind('<svg viewBox="0 0 10 10"></svg>', ''), 'svg');
  assert.equal(detectPreviewKind('#set page(width: 10cm)', 'typst'), 'typst');
  assert.equal(detectPreviewKind('\\documentclass{article}', ''), 'latex');
  assert.equal(detectPreviewKind('E=mc^2', 'tex'), 'latex');
  assert.equal(detectPreviewKind('const x = 1', 'js'), null);
});

test('HTML preview permits external resource URLs', () => {
  const html = previewDocument('<img src="https://example.com/image.png">', 'html');
  assert.match(html, /https:\/\/example\.com\/image\.png/);
  assert.doesNotMatch(html, /Content-Security-Policy/);
});

test('LaTeX math and documents produce preview HTML', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const { renderLatex } = await import('../src/lib/latexPreview.ts');
  assert.match(renderLatex('E=mc^2'), /katex-html/);
  const document = renderLatex('\\documentclass{article}\\begin{document}Hello Latex\\end{document}');
  assert.match(document, /Hello Latex/);
  assert.match(document, /cdn\.jsdelivr\.net/);
});

test('Typst compiles a document with bundled Latin and CJK fonts', async () => {
  const fonts = ['DejaVuSans.ttf', 'NotoSansCJK-Regular.ttc']
    .map(name => new Uint8Array(readFileSync(new URL(`../public/fonts/${name}`, import.meta.url))));
  $typst.use(TypstSnippet.disableDefaultFontAssets(), TypstSnippet.preloadFonts(fonts));
  const svg = await $typst.svg({ mainContent: '#set page(width: 5cm, height: 3cm)\n你好 Typst!' });
  assert.match(svg, /<svg/);
  assert.match(svg, /typst-doc/);
});
