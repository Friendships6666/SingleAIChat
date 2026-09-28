import type { Config, Content, Role, Usage } from '../types';

interface ApiMessage { role: Role | 'system'; content: Content }
interface Chunk {
  id?: string;
  model?: string;
  system_fingerprint?: string;
  choices?: { delta?: { content?: string } }[];
  usage?: Usage;
}

export async function streamCompletion(
  config: Config, messages: ApiMessage[], signal: AbortSignal,
  onContent: (value: string) => void, onUsage: (usage: Usage) => void,
  onStatus: (stage: string, detail: string) => void = () => {}
): Promise<string> {
  const body = JSON.stringify({ model: config.model, messages, temperature: config.temperature,
    reasoning_effort: config.reasoningEffort,
    stream: true, stream_options: { include_usage: true } });
  onStatus('握手', 'POST /chat/completions · 等待响应头');
  onStatus('PAYLOAD', `${new TextEncoder().encode(body).byteLength} B · SSE 流式响应`);
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey || ''}` },
    body,
    signal
  });
  onStatus('HTTP', `${response.status} ${response.statusText || ''}`.trim());
  onStatus('协商', response.headers.get('content-type') || '未提供 Content-Type');
  for (const [header, label] of [
    ['x-request-id', 'Request ID'], ['openai-request-id', 'Request ID'],
    ['cf-ray', 'Edge ID'], ['server-timing', 'Server Timing'],
    ['x-ratelimit-remaining-requests', '剩余请求'],
    ['x-ratelimit-remaining-tokens', '剩余 Token']
  ]) {
    const value = response.headers.get(header);
    if (value) onStatus('META', `${label}: ${value}`);
  }
  if (!response.ok) throw new Error(`[HTTP ${response.status}] ${await response.text()}`);
  if (!response.body) throw new Error('响应不支持流式读取');
  onStatus('STREAM', '响应体已连接 · 等待首个数据帧');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let eventLines: string[] = [];
  let firstFrame = true;
  let firstEvent = true;
  const dispatch = () => {
    if (!eventLines.length) return;
    const data = eventLines.join('\n');
    eventLines = [];
    if (data === '[DONE]') return;
    try {
      const chunk = JSON.parse(data) as Chunk;
      if (firstEvent) {
        firstEvent = false;
        onStatus('SSE', '首个事件已解码');
        if (chunk.model) onStatus('MODEL', chunk.model);
        if (chunk.id) onStatus('EVENT', chunk.id);
        if (chunk.system_fingerprint) onStatus('META', `Fingerprint: ${chunk.system_fingerprint}`);
      }
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) { content += delta; onContent(content); }
      if (chunk.usage) onUsage(chunk.usage);
    } catch { /* Ignore malformed server events. */ }
  };
  const consume = (line: string) => {
    if (!line.trim()) dispatch();
    else if (line.startsWith('data:')) eventLines.push(line.slice(5).trimStart());
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstFrame) {
      firstFrame = false;
      onStatus('RX', `首帧 ${value.byteLength} B`);
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(consume);
  }
  buffer += decoder.decode();
  if (buffer) consume(buffer);
  dispatch();
  return content;
}
