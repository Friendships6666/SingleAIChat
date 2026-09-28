import assert from 'node:assert/strict';
import test from 'node:test';
import { loadExactWorkspace, saveExactWorkspace } from '../src/lib/exactWorkspace.ts';
import { addNode, createSession } from '../src/lib/workspace.ts';

test('restores exact image and long-text history from IndexedDB', async () => {
  const originalIndexedDB = globalThis.indexedDB;
  const records = new Map();
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          createObjectStore() {},
          close() {},
          transaction() {
            const transaction = {
              objectStore() {
                return {
                  put(value, key) {
                    records.set(key, structuredClone(value));
                    queueMicrotask(() => transaction.oncomplete());
                  },
                  get(key) {
                    const result = { result: structuredClone(records.get(key)) };
                    queueMicrotask(() => transaction.oncomplete());
                    return result;
                  }
                };
              }
            };
            return transaction;
          }
        };
        request.onupgradeneeded?.();
        request.onsuccess();
      });
      return request;
    }
  };

  try {
    const session = createSession();
    const imageData = 'data:image/png;base64,AAAA';
    const longText = 'long text '.repeat(7000);
    addNode(session, 'user', [{ type: 'text', text: longText },
      { type: 'image_url', image_url: { url: imageData } }]);
    const workspace = { version: 1, activeSessionId: session.id, sessions: [session] };
    const saving = saveExactWorkspace(workspace);
    session.nodes[0].content[1].image_url.url = 'changed after save';
    await saving;

    const restored = await loadExactWorkspace();
    assert.equal(restored.sessions[0].nodes[0].content[0].text, longText);
    assert.equal(restored.sessions[0].nodes[0].content[1].image_url.url, imageData);
  } finally {
    globalThis.indexedDB = originalIndexedDB;
  }
});
