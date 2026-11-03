// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopicForm } from './components/TopicForm';
import { VocabularyForm } from './components/VocabularyForm';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => cleanup());
function show(kind: 'topic' | 'vocabulary') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}>{kind === 'topic'
    ? <TopicForm onClose={vi.fn()} onSaved={async () => {}} />
    : <VocabularyForm topicId={1} onClose={vi.fn()} onSaved={async () => {}} />}</QueryClientProvider>);
}

it('links the Topic name and image fields to actionable inline errors', async () => {
  show('topic');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu chủ đề' }));
  const name = screen.getByLabelText('Tên chủ đề *');
  const image = screen.getByLabelText('Ảnh *');
  expect(name.getAttribute('aria-invalid')).toBe('true');
  expect(image.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(name.getAttribute('aria-describedby')!.split(' ').at(-1)!)?.textContent).toContain('Nhập tên chủ đề');
  expect(document.activeElement).toBe(name);
});

it('shows an oversize image error next to the upload field', async () => {
  show('topic');
  const upload = screen.getByLabelText('Ảnh *');
  await userEvent.upload(upload, new File([new Uint8Array(2097153)], 'large.png', { type: 'image/png' }));
  expect(upload.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText('Ảnh vượt 2 MiB. Hãy chọn ảnh nhỏ hơn.')).toBeTruthy();
});

it('links invalid vocabulary fields to errors and keeps the entered value', async () => {
  show('vocabulary');
  const word = screen.getByLabelText('Từ tiếng Anh *');
  await userEvent.type(word, 'two words');
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu từ vựng' }));
  expect(word.getAttribute('aria-invalid')).toBe('true');
  expect((word as HTMLInputElement).value).toBe('two words');
  expect(screen.getByLabelText('Nghĩa tiếng Việt *').getAttribute('aria-invalid')).toBe('true');
});
