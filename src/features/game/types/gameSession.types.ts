export type SessionStatus = 'playing' | 'finished' | 'cancelled' | 'expired';

export interface GameSessionWord {
  vocabId: number;
  orderNo: number;
  meaningVi: string;
  ipa: string;
  wordLength: number;
  letters: string[];
  hasAudio: boolean;
}

export interface CreateSessionRequest {
  topicId: number;
}

export interface GameSessionData {
  sessionId: number;
  topicId: number;
  status: SessionStatus;
  totalWords: number;
  maxAttemptPerWord: number;
  sessionTimeoutMinutes: number;
  words: GameSessionWord[];
}

export interface SubmitAttemptRequest {
  vocabId: number;
  submittedLetters: string;
}

export interface SubmitAttemptResponse {
  isCorrect: boolean;
  attemptNo: number;
  attemptsLeft: number;
  points: number;
  wordDone: boolean;
  correctWord: string | null;
  wordsDone: number;
  totalWords: number;
  sessionDone: boolean;
  sessionScore: number;
}

export interface FinishSessionResponse {
  isWon: boolean;
  score: number;
  currentStreak: number;
  weeklyScore?: number;
}
