export type PreviewKind = 'html' | 'svg' | 'typst' | 'latex';

export function detectPreviewKind(code: string, language: string): PreviewKind | null {
  const lang = language.trim().toLowerCase();
  const source = code.trimStart();
  if (lang === 'typst' || lang === 'typ') return 'typst';
  if (lang === 'latex' || lang === 'tex' || /^\\documentclass(?:\[|\{)/.test(source)) return 'latex';
  if (lang === 'svg' || /^<svg(?:\s|>)/i.test(source)) return 'svg';
  if (lang === 'html' || lang === 'htm' || /^<!doctype\s+html\b/i.test(source) || /^<html(?:\s|>)/i.test(source)) return 'html';
  return null;
}

export function previewDocument(code: string, kind: PreviewKind): string {
  const svgStyle = '<style>html,body{margin:0;min-height:100%;display:grid;place-items:center;background:white}svg{display:block;max-width:100%;max-height:100vh}</style>';
  return '<!doctype html>' + (kind === 'svg' || kind === 'typst' ? svgStyle : '') + code;
}

export async function compilePreview(code: string, kind: PreviewKind): Promise<string> {
  if (kind === 'typst') {
    const { renderTypst } = await import('./typstPreview');
    return previewDocument(await renderTypst(code), kind);
  }
  if (kind === 'latex') {
    const { renderLatex } = await import('./latexPreview');
    return renderLatex(code);
  }
  return previewDocument(code, kind);
}
