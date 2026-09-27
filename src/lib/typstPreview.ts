import { $typst } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm?url';
import rendererWasmUrl from '@myriaddreamin/typst-ts-renderer/wasm?url';

$typst.setCompilerInitOptions({ getModule: () => compilerWasmUrl });
$typst.setRendererInitOptions({ getModule: () => rendererWasmUrl });
const fonts = ['DejaVuSans.ttf', 'NotoSansCJK-Regular.ttc']
  .map(name => new URL(`${import.meta.env.BASE_URL}fonts/${name}`, location.href).href);
$typst.use(TypstSnippet.disableDefaultFontAssets(), TypstSnippet.preloadFonts(fonts));

// The shared compiler mutates its document state, so run previews sequentially.
let previous: Promise<unknown> = Promise.resolve();
export function renderTypst(code: string): Promise<string> {
  const result = previous.then(() => $typst.svg({ mainContent: code }));
  previous = result.catch(() => undefined);
  return result;
}
