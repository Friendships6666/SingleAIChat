<script lang="ts">
  import { afterUpdate, mount, onDestroy, unmount } from 'svelte';
  import { Copy, Check } from 'lucide-svelte';
  import CodePreview from './CodePreview.svelte';
  import { renderMarkdown } from '../lib/markdown';
  import { detectPreviewKind } from '../lib/preview';
  import type { Content, Role } from '../types';
  export let role: Role;
  export let content: Content;
  export let streaming = false;
  let copied = false;
  let markdownRoot: HTMLDivElement;
  let previewedRaw = '';
  let previewedStreaming = false;
  let clearPreviews: (() => void)[] = [];
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }
  $: raw = typeof content === 'string' ? content : content.filter(part => part.type === 'text').map(part => part.text).join('\n');

  afterUpdate(() => {
    if (role !== 'assistant' || (raw === previewedRaw && streaming === previewedStreaming)) return;
    clearPreviews.forEach(clear => clear());
    clearPreviews = [];
    previewedRaw = raw;
    previewedStreaming = streaming;
    if (streaming || !markdownRoot) return;
    for (const pre of Array.from(markdownRoot.querySelectorAll('pre'))) {
      const code = pre.querySelector('code');
      if (!code) continue;
      const source = code.textContent || '';
      const kind = detectPreviewKind(source, pre.dataset.language || '');
      if (!kind) continue;
      const host = document.createElement('div');
      pre.insertAdjacentElement('afterend', host);
      const component = mount(CodePreview, { target: host, props: { code: source, kind } });
      clearPreviews.push(() => { void unmount(component); host.remove(); });
    }
  });
  onDestroy(() => clearPreviews.forEach(clear => clear()));
</script>

<div class:user={role === 'user'} class="message-row">
  <div class:assistant={role === 'assistant'} class="message-bubble">
    {#if role === 'user'}
      {#if typeof content === 'string'}{content}{:else}
        {#each content as part}
          {#if part.type === 'text'}<div>{part.text}</div>{:else}<img class="message-image" src={part.image_url.url} alt="上传的图片" />{/if}
        {/each}
      {/if}
    {:else}
      {#if raw}<div bind:this={markdownRoot} class="markdown-body">{@html renderMarkdown(raw)}</div>{:else}<span class="typing">▍</span>{/if}
      {#if raw}<button class="copy-message icon-button" title={copied ? '已复制' : '复制回复'} aria-label="复制回复" onclick={() => copy(raw)}>{#if copied}<Check size={15}/>{:else}<Copy size={15}/>{/if}</button>{/if}
    {/if}
  </div>
</div>
