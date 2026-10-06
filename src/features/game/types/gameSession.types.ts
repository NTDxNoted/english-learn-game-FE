export type SessionStatus = 'playing' | 'finished' | 'cancelled' | 'expired' | 'PLAYING' | 'COMPLETED' | 'ABANDONED';

export type GameMode = 'CHECKPOINT' | 'FREE_PLAY' | 'REVIEW';

export interface BackendGameQuestion {
  vocabularyId: number;
  meaningVi: string;
  scrambledLetters: string[];
}

export interface BackendGameResumeQuestion {
  vocabularyId: number;
  meaningVi: string;
  scrambledLetters: string[];
  topicPosition?: number;
  status?: string;
  attemptsUsed?: number;
  correctlyAnswered?: boolean;
}

export interface BackendGameSessionResumeResponse {
  sessionId: number;
  topicId: number;
  topicName?: string;
  mode?: GameMode;
  status: string;
  batchStartPosition?: number;
  batchEndPosition?: number;
  questionCount?: number;
  score?: number;
  resolvedQuestions?: number;
  currentVocabularyId?: number;
  maxAttemptsPerWord?: number;
  currentAttemptsUsed?: number;
  remainingAttempts?: number;
  startedAt?: string;
  questions: BackendGameResumeQuestion[];
}

export interface BackendGameSessionResponse {
  sessionId: number;
  topicId: number;
  topicName: string;
  mode: GameMode;
  status: string;
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
  sessionWon?: boolean | null;
  pointsEarned: number;
  totalScore: number;
  nextVocabularyId?: number | null;
  correctWord?: string | null;
  currentStreak?: number | null;
}

export interface GameSessionWord {
  vocabId: number;
  orderNo: number;
  meaningVi: string;
  ipa?: string;
  wordLength: number;
  letters: string[];
  hasAudio?: boolean;
}

export interface CreateSessionRequest {
  topicId: number;
  mode?: GameMode;
}

export interface GameSessionData {
  sessionId: number;
  topicId: number;
  status: SessionStatus;
  totalWords: number;
  maxAttemptPerWord: number;
  sessionTimeoutMinutes: number;
  words: GameSessionWord[];
  initialWordIndex?: number;
  currentScore?: number;
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
  wordsDone?: number;
  totalWords?: number;
  sessionDone: boolean;
  sessionScore: number;
  sessionWon?: boolean | null;
  currentStreak?: number | null;
}

export interface FinishSessionResponse {
  isWon: boolean;
  score: number;
  currentStreak: number;
  weeklyScore?: number;
}
