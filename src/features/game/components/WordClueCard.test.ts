import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WordClueCard } from './WordClueCard';

it('disables the audio control when the current word has no URL', () => {
  const html = renderToStaticMarkup(createElement(WordClueCard, {
    meaningVi: 'Đường', hasAudio: false, onSpeak: () => {},
  }));
  expect(html).toContain('disabled=""');
  expect(html).toContain('Từ này chưa có âm thanh');
});

it('enables the audio control for a word with audio', () => {
  const html = renderToStaticMarkup(createElement(WordClueCard, {
    meaningVi: 'Đường', hasAudio: true, onSpeak: () => {},
  }));
  expect(html).not.toContain('disabled=""');
  expect(html).toContain('Nghe phát âm từ tiếng Anh');
});
