<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { Config } from '../types';
  export let config: Config;
  export let close: () => void;
  export let save: (config: Config) => void;
  let draft: Config = { ...config };
  function submit() {
    const baseUrl = draft.baseUrl.trim().replace(/\/+$/, '');
    const model = draft.model.trim();
    if (!baseUrl || !model) { alert('请至少填写 API Base URL 与模型名称！'); return; }
    save({ ...draft, baseUrl, model, apiKey: draft.apiKey.trim(), systemPrompt: draft.systemPrompt.trim(), temperature: Number(draft.temperature) });
  }
</script>

<div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) close(); }}>
  <div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="modal-header"><h2 id="settings-title">自定义 API 接口配置</h2><button class="icon-button" title="关闭" aria-label="关闭" onclick={close}><X size={18}/></button></div>
    <form onsubmit={(event) => { event.preventDefault(); submit(); }}>
      <label>API Base URL <span class="required">*</span><input type="url" bind:value={draft.baseUrl} placeholder="例如: https://api.deepseek.com/v1" required /></label>
      <label>API Key<input type="password" bind:value={draft.apiKey} placeholder="sk-..." /></label>
      <label>模型名称 (Model) <span class="required">*</span><input bind:value={draft.model} placeholder="例如: deepseek-chat" required /></label>
      <label>System Prompt<textarea rows="3" bind:value={draft.systemPrompt} placeholder="系统指令..."></textarea></label>
      <label>细考强度<select bind:value={draft.reasoningEffort}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="max">Max</option></select></label>
      <label>Temperature: <strong>{draft.temperature}</strong><input type="range" min="0" max="2" step="0.1" bind:value={draft.temperature} /></label>
      <button class="primary-button" type="submit">保存配置</button>
    </form>
  </div>
</div>

<style>
  select { display: block; width: 100%; margin-top: .35rem; padding: .6rem .7rem; border: 1px solid #dfe5ef; border-radius: 5px; background: #f8fafc; color: #0f172a; font-size: 12px; }
  select:focus { border-color: #4365cb; outline: 0; }
</style>
