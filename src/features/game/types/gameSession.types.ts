export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ABANDONED' | 'EXPIRED';
export type GameMode = 'CHECKPOINT' | 'FREE_PLAY' | 'REVIEW';

export interface BackendGameQuestion {
  audioUrl?: string | null;
  vocabularyId: number;
  meaningVi: string;
  scrambledLetters: string[];
}

export interface BackendGameResumeQuestion extends BackendGameQuestion {
  topicPosition?: number;
  status: string;
  attemptsUsed: number;
  correctlyAnswered: boolean;
}

export interface BackendGameSessionResumeResponse {
  sessionId: number;
  topicId: number;
  topicName?: string;
  mode: GameMode;
  status: SessionStatus;
  batchStartPosition?: number;
  batchEndPosition?: number;
  questionCount: number;
  score: number | null;
  resolvedQuestions: number;
  currentVocabularyId: number | null;
  maxAttemptsPerWord: number;
  currentAttemptsUsed: number;
  remainingAttempts: number;
  startedAt?: string;
  questions: BackendGameResumeQuestion[];
}

export interface BackendGameSessionResponse {
  sessionId: number;
  topicId: number;
  topicName: string;
  mode: GameMode;
  status: SessionStatus;
  batchStartPosition?: number;
  batchEndPosition?: number;
  totalQuestions: number;
  startedAt?: string;
  questions: BackendGameQuestion[];
}

export interface BackendSubmitAttemptResponse {
  sessionId: number;
  vocabularyId: number;
  correct: boolean;
  attemptNumber: number;
  remainingAttempts: number;
  wordCompleted: boolean;
  sessionCompleted: boolean;
  sessionWon: boolean | null;
  pointsEarned: number;
  totalScore: number;
  nextVocabularyId: number | null;
  correctWord: string | null;
  currentStreak: number | null;
}

export interface BackendGameHistoryDetailResponse {
  sessionId: number;
  topicId: number;
  topicName: string;
  mode: GameMode;
  status: SessionStatus;
  score: number | null;
  won: boolean;
  startedAt: string;
  endedAt: string | null;
  maxAttemptsPerWord: number | null;
  questionCount: number;
  historyComplete: boolean;
  questions: unknown[];
}

export interface GameSessionWord {
  audioUrl?: string | null;
  vocabId: number;
  orderNo: number;
  meaningVi: string;
  ipa?: string;
  wordLength: number;
  letters: string[];
  hasAudio?: boolean;
  status: string;
  attemptsUsed: number;
  remainingAttempts: number;
  correctlyAnswered: boolean;
}

export interface CreateSessionRequest {
  topicId: number;
  mode?: GameMode;
}

export interface GameSessionData {
  sessionId: number;
  topicId: number;
  mode: GameMode;
  status: SessionStatus;
  totalWords: number;
  maxAttemptPerWord: number;
  words: GameSessionWord[];
  initialWordIndex: number;
  currentVocabularyId: number | null;
  remainingAttempts: number;
  currentScore: number;
}

export interface SubmitAttemptRequest {
  vocabId: number;
  submittedLetters: string | string[];
  timeMs?: number;
}

export interface SubmitAttemptResponse {
  isCorrect: boolean;
  attemptNo: number;
  attemptsLeft: number;
  points: number;
  wordDone: boolean;
  correctWord: string | null;
  sessionDone: boolean;
  sessionScore: number;
  sessionWon: boolean | null;
  currentStreak: number | null;
  nextVocabularyId: number | null;
}

export interface FinishSessionResponse {
  isWon: boolean;
  score: number | null;
  currentStreak: number | null;
}
