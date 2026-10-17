/**
 * [LEARN-01] Types cho luồng Học từ vựng theo nhóm 5 từ (Checkpoint Batch)
 * Đồng bộ 100% với LearningResponse & LearningProgressResponse của Backend.
 */

export type LearningMode = 'NEW' | 'LEARNING' | 'CHECKPOINT_REQUIRED' | 'REVIEW';

export interface LearningVocabularyItem {
  id: number;
  word: string;
  meaningVi: string;
  ipa: string | null;
  audioUrl: string | null;
  orderNo: number;
}

export interface LearningResponse {
  topicId: number;
  topicName: string;
  mode: LearningMode;
  totalVocabularies: number;
  furthestPosition: number | null;
  startPosition: number | null;
  startVocabId: number | null;
  completed: boolean;
  vocabularies: LearningVocabularyItem[];
}

export interface LearningProgressRequest {
  vocabId: number;
}

export interface LearningProgressResponse {
  topicId: number;
  furthestVocabId: number;
  furthestPosition: number;
  updatedAt: string;
  message: string;
}

export const WORDS_PER_CHECKPOINT = 5;

