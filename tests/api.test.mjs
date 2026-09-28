import assert from 'node:assert/strict';
import test from 'node:test';
import { streamCompletion } from '../src/lib/api.ts';

test('reports observable connection stages and response metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    'data: {"id":"evt-1","model":"test-model","choices":[{"delta":{"content":"Hello"}}]}\n\n',
    { headers: { 'content-type': 'text/event-stream', 'x-request-id': 'req-123' } }
  );
  const statuses = [];
  const contents = [];
  try {
    const result = await streamCompletion(
      { baseUrl: 'https://example.test/v1', apiKey: 'secret-key', model: 'test-model',
        systemPrompt: '', temperature: 0.7, reasoningEffort: 'medium' },
      [{ role: 'user', content: 'Hi' }], new AbortController().signal,
      value => contents.push(value), () => {}, (stage, detail) => statuses.push(`${stage} ${detail}`)
    );
    assert.equal(result, 'Hello');
    assert.deepEqual(contents, ['Hello']);
    assert.match(statuses.join('\n'), /握手.*等待响应头/);
    assert.match(statuses.join('\n'), /PAYLOAD \d+ B · SSE 流式响应/);
    assert.match(statuses.join('\n'), /HTTP 200/);
    assert.match(statuses.join('\n'), /text\/event-stream/);
    assert.match(statuses.join('\n'), /Request ID: req-123/);
    assert.match(statuses.join('\n'), /首帧/);
    assert.match(statuses.join('\n'), /MODEL test-model/);
    assert.doesNotMatch(statuses.join('\n'), /secret-key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sends ultra and model-specific reasoning effort names unchanged', async () => {
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response('data: [DONE]\n\n');
  };
  try {
    for (const reasoningEffort of ['ultra', 'model-specific-level']) {
      await streamCompletion(
        { baseUrl: 'https://example.test/v1', apiKey: '', model: 'test-model',
          systemPrompt: '', temperature: 0.7, reasoningEffort },
        [{ role: 'user', content: 'Hi' }], new AbortController().signal,
        () => {}, () => {}
      );
    }
    assert.deepEqual(sent.map(body => body.reasoning_effort), ['ultra', 'model-specific-level']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
