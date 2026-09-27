import type { Config, Content, MessageNode, ReasoningEffort, Role, Session, Workspace } from '../types';

const CONFIG_KEY = 'stupidchat_config';
const HISTORY_KEY = 'stupidchat_history';
const WORKSPACE_KEY = 'stupidchat_workspace_v1';
const STORAGE_LIMIT = 4 * 1024 * 1024;
const MESSAGE_LIMIT = 48000;

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}

export function createId(): string {
  return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}
export function createSession(title = '新对话'): Session {
  const now = Date.now();
  return { id: createId(), title, createdAt: now, updatedAt: now, activeNodeId: null, nodes: [] };
}
export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<Workspace>;
  return data.version === 1 && Array.isArray(data.sessions) && data.sessions.length > 0;
}
export function loadWorkspace(): Workspace {
  const saved = readJson<unknown>(WORKSPACE_KEY, null);
  if (isWorkspace(saved)) return saved;
  const legacy = readJson<{ role: Role; content: Content }[]>(HISTORY_KEY, []);
  const session = createSession(legacy.length ? '已迁移对话' : '新对话');
  for (const item of legacy) addNode(session, item.role, item.content);
  return { version: 1, activeSessionId: session.id, sessions: [session] };
}
export function loadConfig(): Config {
  const config = { baseUrl: '', apiKey: '', model: '', systemPrompt: '', temperature: 0.7,
    reasoningEffort: 'medium' as ReasoningEffort, ...readJson<Partial<Config>>(CONFIG_KEY, {}) };
  if (!['low', 'medium', 'high', 'max'].includes(config.reasoningEffort)) config.reasoningEffort = 'medium';
  return config;
}
export function saveConfig(config: Config): void { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
export function activeSession(workspace: Workspace): Session {
  let session = workspace.sessions.find(item => item.id === workspace.activeSessionId);
  if (!session) {
    session = workspace.sessions[0] || createSession();
    if (!workspace.sessions.length) workspace.sessions.push(session);
    workspace.activeSessionId = session.id;
  }
  return session;
}
export function nodePath(session: Session): MessageNode[] {
  const nodes = new Map(session.nodes.map(node => [node.id, node]));
  const path: MessageNode[] = [];
  const seen = new Set<string>();
  let node = session.activeNodeId ? nodes.get(session.activeNodeId) : undefined;
  while (node && !seen.has(node.id)) {
    path.unshift(node);
    seen.add(node.id);
    node = node.parentId ? nodes.get(node.parentId) : undefined;
  }
  return path;
}
export function addNode(session: Session, role: Role, content: Content): MessageNode {
  const node: MessageNode = { id: createId(), parentId: session.activeNodeId, role, content, createdAt: Date.now() };
  session.nodes.push(node);
  session.activeNodeId = node.id;
  session.updatedAt = node.createdAt;
  if (role === 'user' && session.title === '新对话') {
    const source = typeof content === 'string' ? content : content.find(part => part.type === 'text')?.text || '图片对话';
    session.title = source.replace(/\s+/g, ' ').slice(0, 28) || '新对话';
  }
  return node;
}
function storedContent(content: Content): Content {
  const truncate = (text: string) => text.length <= MESSAGE_LIMIT ? text :
    `${text.slice(0, MESSAGE_LIMIT / 2)}\n\n[内容过长，已在本地历史中截断]\n\n${text.slice(-MESSAGE_LIMIT / 2)}`;
  if (typeof content === 'string') return truncate(content);
  return content.map(part => part.type === 'text'
    ? { type: 'text' as const, text: truncate(part.text) }
    : { type: 'text' as const, text: '[图片附件仅在当前会话中可用]' });
}
export function storableWorkspace(workspace: Workspace): Workspace {
  return { version: 1, activeSessionId: workspace.activeSessionId,
    sessions: workspace.sessions.map(session => ({ ...session,
      nodes: session.nodes.map(node => ({ ...node, content: storedContent(node.content) })) })) };
}
export function saveWorkspace(workspace: Workspace): boolean {
  const stored = storableWorkspace(workspace);
  let serialized = JSON.stringify(stored);
  while (new Blob([serialized]).size > STORAGE_LIMIT && stored.sessions.length > 1) {
    const oldest = stored.sessions.filter(s => s.id !== stored.activeSessionId).sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (!oldest) break;
    stored.sessions = stored.sessions.filter(s => s.id !== oldest.id);
    serialized = JSON.stringify(stored);
  }
  const current = activeSession(stored);
  while (new Blob([serialized]).size > STORAGE_LIMIT && current.nodes.length > 1) {
    current.nodes.shift();
    if (current.nodes[0]) current.nodes[0].parentId = null;
    serialized = JSON.stringify(stored);
  }
  try {
    localStorage.setItem(WORKSPACE_KEY, serialized);
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch { return false; }
}
export function exportWorkspace(workspace: Workspace): void {
  const data = { format: 'singleaichat-memory', version: 1, exportedAt: new Date().toISOString(), workspace: storableWorkspace(workspace) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `singleaichat-memory-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
export async function importWorkspace(file: File, workspace: Workspace): Promise<Workspace> {
  const data: unknown = JSON.parse(await file.text());
  const wrapped = data as { format?: string; workspace?: unknown };
  const source = wrapped?.format === 'stupidchat-memory' || wrapped?.format === 'singleaichat-memory' ? wrapped.workspace : data;
  if (!isWorkspace(source)) throw new Error('文件格式不正确');
  if (!source.sessions.every(item => Array.isArray(item.nodes))) throw new Error('文件格式不正确');
  const sessions = source.sessions.map(old => {
    const ids = new Map(old.nodes.map(node => [node.id, createId()]));
    const session = createSession(String(old.title || '导入对话').slice(0, 80));
    session.nodes = old.nodes.filter(node => node.role === 'user' || node.role === 'assistant').map(node => ({
      id: ids.get(node.id)!, parentId: node.parentId ? ids.get(node.parentId) || null : null,
      role: node.role, content: node.content, createdAt: Number(node.createdAt) || Date.now(),
      references: Array.isArray(node.references) ? node.references : []
    }));
    session.activeNodeId = old.activeNodeId ? ids.get(old.activeNodeId) || null : null;
    session.activeNodeId ||= session.nodes.at(-1)?.id || null;
    session.createdAt = Number(old.createdAt) || Date.now();
    session.updatedAt = Number(old.updatedAt) || Date.now();
    return session;
  });
  return { ...workspace, activeSessionId: sessions.at(-1)!.id, sessions: [...workspace.sessions, ...sessions] };
}
