<script lang="ts">
  import { Paperclip, Send, Square, X, FileText, Image } from 'lucide-svelte';
  import type { Attachment, Usage } from '../types';
  export let attachments: Attachment[];
  export let usage: Usage;
  export let generating: boolean;
  export let disabled = false;
  export let send: (text: string) => void;
  export let stop: () => void;
  export let addFiles: (files: FileList | File[]) => void;
  export let removeFile: (index: number) => void;
  let text = '';
  let textarea: HTMLTextAreaElement;
  let fileInput: HTMLInputElement;
  function adjust() { textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'; }
  function submit() { if (!generating && !disabled && (text.trim() || attachments.length)) { send(text.trim()); text = ''; setTimeout(adjust); } }
  function paste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length) addFiles(files);
  }
</script>

<footer class="composer"><div class="composer-inner">
  <div class="token-stats"><div>Tokens: <span>Prompt: <b>{usage.prompt_tokens}</b></span><span>Output: <b>{usage.completion_tokens}</b></span><span>Total: <b class="total">{usage.total_tokens}</b></span></div><small>当前会话完整上下文</small></div>
  {#if attachments.length}<div class="attachment-tray">{#each attachments as file, index}<div class="attachment-chip">{#if file.isImage}<Image size={14}/>{:else}<FileText size={14}/>{/if}<span title={file.name}>{file.name}</span><small>({(file.size / 1024).toFixed(1)}KB)</small><button title="移除附件" aria-label="移除附件" onclick={() => removeFile(index)}><X size={13}/></button></div>{/each}</div>{/if}
  <div class="input-shell"><button class="icon-button" title="上传代码、文档或图片" aria-label="上传附件" disabled={generating || disabled} onclick={() => fileInput.click()}><Paperclip size={18}/></button><input bind:this={fileInput} type="file" multiple hidden onchange={(event) => { if (event.currentTarget.files) addFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
    <textarea bind:this={textarea} bind:value={text} rows="1" placeholder="输入问题或说明..." disabled={generating || disabled} oninput={adjust} onpaste={paste} onkeydown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); } }}></textarea>
    {#if generating}<button class="stop-button" title="停止生成" aria-label="停止生成" onclick={stop}><Square size={16}/></button>{:else}<button class="send-button" title="发送" aria-label="发送" disabled={disabled} onclick={submit}><Send size={17}/></button>{/if}
  </div>
</div></footer>
