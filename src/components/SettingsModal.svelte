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
    if (!draft.reasoningEffort.trim()) { alert('请填写思考程度！'); return; }
    save({ ...draft, baseUrl, model, apiKey: draft.apiKey.trim(), systemPrompt: draft.systemPrompt.trim(),
      reasoningEffort: draft.reasoningEffort.trim(), temperature: Number(draft.temperature) });
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
      <label>思考程度<input list="reasoning-effort-options" bind:value={draft.reasoningEffort} placeholder="例如: ultra" required /></label>
      <datalist id="reasoning-effort-options"><option value="low"></option><option value="medium"></option><option value="high"></option><option value="max"></option><option value="ultra"></option></datalist>
      <label>Temperature: <strong>{draft.temperature}</strong><input type="range" min="0" max="2" step="0.1" bind:value={draft.temperature} /></label>
      <button class="primary-button" type="submit">保存配置</button>
    </form>
  </div>
</div>
