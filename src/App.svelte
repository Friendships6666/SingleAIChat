<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Plus, PanelLeft, Download, Upload, Trash2, Settings, X } from 'lucide-svelte';
  import ChatMessage from './components/ChatMessage.svelte';
  import Composer from './components/Composer.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import { streamCompletion } from './lib/api';
  import { makeUserContent, readAttachments } from './lib/attachments';
  import { activeSession, addNode, createSession, exportWorkspace, importWorkspace, loadConfig, loadWorkspace, nodePath, saveConfig, saveWorkspace } from './lib/workspace';
  import type { Attachment, Config, Usage, Workspace } from './types';

  let config: Config = loadConfig();
  let workspace: Workspace = loadWorkspace();
  let attachments: Attachment[] = [];
  let usage: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let settingsOpen = false;
  let sidebarOpen = true;
  let generating = false;
  let streaming = '';
  let streamingSessionId: string | null = null;
  let requestError: { sessionId: string; message: string } | null = null;
  let requestController: AbortController | null = null;
  let importInput: HTMLInputElement;
  let chatBox: HTMLElement;
  $: session = activeSession(workspace);
  $: messages = nodePath(session);
  $: sessions = [...workspace.sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  onMount(() => {
    if (matchMedia('(max-width: 899px)').matches) sidebarOpen = false;
    if (!config.baseUrl || !config.model) setTimeout(() => settingsOpen = true, 300);
    const prevent = (event: DragEvent) => event.preventDefault();
    const drop = (event: DragEvent) => { event.preventDefault(); if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', drop); requestController?.abort(); };
  });
  async function scrollBottom() { await tick(); chatBox?.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' }); }
  function refresh() { workspace = { ...workspace }; saveWorkspace(workspace); scrollBottom(); }
  async function addFiles(files: FileList | File[]) {
    try { attachments = [...attachments, ...await readAttachments(files)]; }
    catch (error) { alert(`读取附件失败：${error instanceof Error ? error.message : String(error)}`); }
  }
  function resetUsage() { usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }; }
  function newChat() {
    workspace.sessions.push(createSession());
    workspace.activeSessionId = workspace.sessions.at(-1)!.id;
    resetUsage(); refresh();
    if (matchMedia('(max-width: 899px)').matches) sidebarOpen = false;
  }
  function selectSession(id: string) {
    workspace.activeSessionId = id; resetUsage(); refresh();
    if (matchMedia('(max-width: 899px)').matches) sidebarOpen = false;
  }
  function deleteChat() {
    if (!confirm(`确认删除“${session.title}”？`)) return;
    if (streamingSessionId === session.id) requestController?.abort();
    workspace.sessions = workspace.sessions.filter(item => item.id !== session.id);
    if (!workspace.sessions.length) workspace.sessions.push(createSession());
    workspace.activeSessionId = workspace.sessions[0].id;
    resetUsage(); refresh();
  }
  async function handleImport(file: File) {
    try { workspace = await importWorkspace(file, workspace); resetUsage(); refresh(); }
    catch (error) { alert(`导入失败：${error instanceof Error ? error.message : String(error)}`); }
    importInput.value = '';
  }
  async function send(text: string) {
    if (!config.baseUrl || !config.model) { settingsOpen = true; return; }
    requestError = null;
    const current = session;
    const content = makeUserContent(text, attachments);
    addNode(current, 'user', content);
    attachments = [];
    refresh();
    generating = true;
    streaming = '';
    streamingSessionId = current.id;
    requestController = new AbortController();
    const requestMessages: { role: 'system' | 'user' | 'assistant'; content: typeof content }[] = [];
    if (config.systemPrompt) requestMessages.push({ role: 'system', content: config.systemPrompt });
    requestMessages.push(...nodePath(current).map(node => ({ role: node.role, content: node.content })));
    try {
      const response = await streamCompletion(config, requestMessages, requestController.signal,
        value => { streaming = value; scrollBottom(); }, value => usage = value);
      addNode(current, 'assistant', response);
      refresh();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (streaming) { addNode(current, 'assistant', streaming); refresh(); }
      } else {
        requestError = { sessionId: current.id, message: `请求失败: ${error instanceof Error ? error.message : String(error)}` };
      }
    } finally {
      generating = false;
      streamingSessionId = null;
      requestController = null;
    }
  }
</script>

<div class:sidebar-hidden={!sidebarOpen} class="app-shell">
  <header class="topbar">
    <div class="brand-group"><span class="brand">SingleAIChat</span><span class="model-badge" title={config.model}>{config.model || '未设置模型'}</span><span class="host-badge" title={config.baseUrl}>{config.baseUrl ? `(${config.baseUrl})` : '(无 API 接口)'}</span></div>
    <div class="toolbar">
      <button class="icon-button" title="新建对话" aria-label="新建对话" onclick={newChat}><Plus size={18}/></button>
      <button class="icon-button" title="会话列表" aria-label="会话列表" onclick={() => sidebarOpen = !sidebarOpen}><PanelLeft size={18}/></button>
      <button class="icon-button" title="导出记忆" aria-label="导出记忆" onclick={() => exportWorkspace(workspace)}><Download size={18}/></button>
      <button class="icon-button" title="导入记忆" aria-label="导入记忆" onclick={() => importInput.click()}><Upload size={18}/></button>
      <input bind:this={importInput} type="file" accept="application/json,.json" hidden onchange={event => { if (event.currentTarget.files?.[0]) handleImport(event.currentTarget.files[0]); }} />
      <button class="icon-button danger" title="删除当前对话" aria-label="删除当前对话" onclick={deleteChat}><Trash2 size={18}/></button>
      <button class="settings-button" title="配置 API" onclick={() => settingsOpen = true}><Settings size={16}/><span>配置 API</span></button>
    </div>
  </header>
  {#if sidebarOpen}<aside class="sidebar"><div class="sidebar-heading"><span>会话列表</span><button class="icon-button" title="关闭会话列表" aria-label="关闭会话列表" onclick={() => sidebarOpen = false}><X size={17}/></button></div><nav aria-label="会话列表">{#each sessions as item (item.id)}<button class:active={item.id === session.id} title={item.title} onclick={() => selectSession(item.id)}>{item.title || '未命名对话'}</button>{/each}</nav></aside>{/if}
  <main bind:this={chatBox} class="chat-box">
    {#if !messages.length && streamingSessionId !== session.id}<div class="welcome"><h1>SingleAIChat</h1><button class="primary-button" onclick={() => settingsOpen = true}>立即前往配置 API</button></div>{/if}
    {#each messages as node (node.id)}<ChatMessage role={node.role} content={node.content}/>{/each}
    {#if streamingSessionId === session.id && generating}<ChatMessage role="assistant" content={streaming} streaming={true}/>{/if}
    {#if requestError?.sessionId === session.id}<div class="request-error">{requestError.message}</div>{/if}
  </main>
  <Composer {attachments} {usage} {generating} {send} stop={() => requestController?.abort()} {addFiles} removeFile={index => attachments = attachments.filter((_, i) => i !== index)}/>
  {#if settingsOpen}<SettingsModal {config} close={() => settingsOpen = false} save={next => { config = next; saveConfig(config); settingsOpen = false; }}/>{/if}
</div>

<style>
  @media (max-width: 600px) {
    .model-badge { display: none; }
    .brand { font-size: 13px; }
    .topbar .icon-button { width: 29px; height: 29px; }
  }
  @media (max-width: 360px) {
    .brand { font-size: 12px; }
    .topbar .icon-button { width: 27px; height: 27px; }
  }
</style>
