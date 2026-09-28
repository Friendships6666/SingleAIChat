import assert from 'node:assert/strict';
import test from 'node:test';
import { completedMarkdownOffset } from '../src/lib/streamingMarkdown.ts';

test('completes paragraphs at blank lines and headings at line endings', () => {
  assert.equal(completedMarkdownOffset('First line\nsecond line'), 0);
  assert.equal(completedMarkdownOffset('First paragraph\n\nNext'), 'First paragraph\n\n'.length);
  assert.equal(completedMarkdownOffset('# Heading\nNext'), '# Heading\n'.length);
});

test('keeps fenced code together, including internal blank lines', () => {
  const open = 'Before\n\n```js\nconst x = 1;\n\nconst y = 2;\n';
  assert.equal(completedMarkdownOffset(open), 'Before\n\n'.length);
  assert.equal(completedMarkdownOffset(`${open}\n\`\`\``), open.length + '\n```'.length);
});

test('finishes preceding text when a code fence starts', () => {
  assert.equal(completedMarkdownOffset('Intro\n```js\ncode'), 'Intro\n'.length);
});
