import type { Config, Content, Role, Usage } from '../types';

interface ApiMessage { role: Role | 'system'; content: Content }
interface Chunk { choices?: { delta?: { content?: string } }[]; usage?: Usage }

export async function streamCompletion(
  config: Config, messages: ApiMessage[], signal: AbortSignal,
  onContent: (value: string) => void, onUsage: (usage: Usage) => void
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey || ''}` },
    body: JSON.stringify({ model: config.model, messages, temperature: config.temperature,
      reasoning_effort: config.reasoningEffort,
      stream: true, stream_options: { include_usage: true } }),
    signal
  });
  if (!response.ok) throw new Error(`[HTTP ${response.status}] ${await response.text()}`);
  if (!response.body) throw new Error('响应不支持流式读取');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let eventLines: string[] = [];
  const dispatch = () => {
    if (!eventLines.length) return;
    const data = eventLines.join('\n');
    eventLines = [];
    if (data === '[DONE]') return;
    try {
      const chunk = JSON.parse(data) as Chunk;
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
