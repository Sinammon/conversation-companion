import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { Caption } from '../src/types';

test('the first interim caption is a scrollable native list row', () => {
  const source = readFileSync('src/components/caption-feed.tsx', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  // Render the platform component with host stand-ins to inspect the real FlatList data and row renderer.
  const load = (id: string) => {
    if (id === 'react-native') return {
      View: 'div',
      FlatList: ({ data, renderItem }: { data: Caption[]; renderItem: (entry: { item: Caption; index: number }) => React.ReactNode }) =>
        createElement('div', {}, data.length ? renderItem({ item: data[0], index: 0 }) : null),
    };
    if (id === './caption-feed-shared') return {
      CaptionLine: ({ text, interim }: { text: string; interim?: boolean }) => createElement('span', { 'data-interim': interim }, text),
      captionFeedStyles: {},
    };
    if (id === '../capture/transcript') return require('../src/capture/transcript');
    if (id === './ui') return { Copy: () => null };
    return require(id);
  };
  const exports = {} as typeof import('../src/components/caption-feed');
  new Function('require', 'exports', outputText)(load, exports);
  const html = renderToStaticMarkup(createElement(exports.CaptionFeed, {
    transcript: { final: [], partial: { text: 'First utterance still in progress.', at: 0 } },
    size: 26, follow: true, stopped: false,
  }));
  assert.match(html, /data-interim="true">First utterance still in progress/);
});
