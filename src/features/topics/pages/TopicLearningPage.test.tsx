// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TopicLearningPage } from './TopicLearningPage';
import type { LearningResponse } from '../types/learning.types';

const getTopicLearning = vi.hoisted(() => vi.fn());
const saveLearningProgress = vi.hoisted(() => vi.fn());
const refreshVocabularyAudioUrl = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const speak = vi.hoisted(() => vi.fn());

vi.mock('../api/learningApi', () => ({
  learningApi: { getTopicLearning, saveLearningProgress, refreshVocabularyAudioUrl },
}));
vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 42 } }),
}));
vi.mock('../../../app/providers/useToast', () => ({
  useToast: () => ({ success: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../game/hooks/useVocabularyAudio', () => ({
  useVocabularyAudio: () => ({ speak, isSpeaking: false }),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const batchVocabs = [
  { id: 101, word: 'CAT', meaningVi: 'Con mèo', ipa: '/kæt/', audioUrl: 'https://s3.test/cat.mp3', orderNo: 1 },
  { id: 102, word: 'DOG', meaningVi: 'Con chó', ipa: '/dɒɡ/', audioUrl: 'https://s3.test/dog.mp3', orderNo: 2 },
  { id: 103, word: 'BIRD', meaningVi: 'Con chim', ipa: '/bɜːd/', audioUrl: 'https://s3.test/bird.mp3', orderNo: 3 },
  { id: 104, word: 'FISH', meaningVi: 'Con cá', ipa: '/fɪʃ/', audioUrl: 'https://s3.test/fish.mp3', orderNo: 4 },
  { id: 105, word: 'LION', meaningVi: 'Sư tử', ipa: '/ˈlaɪ.ən/', audioUrl: 'https://s3.test/lion.mp3', orderNo: 5 },
];

const mockLearningData = (overrides: Partial<LearningResponse> = {}): LearningResponse => ({
  topicId: 73,
  topicName: 'Animals',
  mode: 'NEW',
  totalVocabularies: 15,
  furthestPosition: null,
  startPosition: 1,
  startVocabId: 101,
  completed: false,
  vocabularies: batchVocabs,
  ...overrides,
});

function show(initialPath = '/topics/73/learn') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/topics/:topicId/learn" element={<TopicLearningPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  getTopicLearning.mockResolvedValue({ data: mockLearningData() });
  saveLearningProgress.mockImplementation(async (_topicId: number, { vocabId }: { vocabId: number }) => {
    const pos = batchVocabs.findIndex((v) => v.id === vocabId) + 1;
    return {
      data: {
        topicId: 73,
        furthestVocabId: vocabId,
        furthestPosition: pos,
        updatedAt: '2026-11-10T10:00:00Z',
        message: 'Learning progress updated successfully',
      },
    };
  });
});

afterEach(() => cleanup());

it('renders the 5-word batch flashcards and advances progress sequentially one by one', async () => {
  show();
  expect(await screen.findByRole('heading', { name: 'CAT' })).toBeTruthy();
  expect(screen.getByText('Con mèo')).toBeTruthy();
  expect(screen.getByText('/kæt/')).toBeTruthy();

  // Advance word 1 -> word 2
  await userEvent.click(screen.getByRole('button', { name: /Đã thuộc & Qua từ tiếp/ }));
  expect(saveLearningProgress).toHaveBeenCalledWith(73, { vocabId: 101 });
  expect(await screen.findByRole('heading', { name: 'DOG' })).toBeTruthy();
  expect(screen.getByText('Con chó')).toBeTruthy();
});

it('saves all remaining unlearned words in the 5-word batch sequentially and launches CHECKPOINT game when clicking Chơi ngay 5 từ này', async () => {
  getTopicLearning.mockResolvedValue({
    data: mockLearningData({ mode: 'LEARNING', furthestPosition: 2, startPosition: 3, startVocabId: 103 }),
  });
  show();
  // Starts at word #3 (BIRD)
  expect(await screen.findByRole('heading', { name: 'BIRD' })).toBeTruthy();

  await userEvent.click(screen.getByRole('button', { name: /Chơi ngay 5 từ này/ }));

  // Must save words 3, 4, 5 sequentially before navigating to CHECKPOINT game
  expect(saveLearningProgress.mock.calls).toEqual([
    [73, { vocabId: 103 }],
    [73, { vocabId: 104 }],
    [73, { vocabId: 105 }],
  ]);
  expect(navigate).toHaveBeenCalledWith('/game/new?topicId=73&mode=CHECKPOINT');
});

it('launches REVIEW game mode when the topic is already completed', async () => {
  getTopicLearning.mockResolvedValue({
    data: mockLearningData({ mode: 'REVIEW', furthestPosition: 5, startPosition: 1, startVocabId: 101, completed: true }),
  });
  show();
  expect(await screen.findByText(/Đã hoàn thành toàn bộ chủ đề/)).toBeTruthy();

  await userEvent.click(screen.getByRole('button', { name: /Chơi ôn tập ngay/ }));
  expect(saveLearningProgress).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('/game/new?topicId=73&mode=REVIEW');
});

