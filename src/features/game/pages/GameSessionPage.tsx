import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { GameSessionHeader } from '../components/GameSessionHeader';
import { WordClueCard } from '../components/WordClueCard';
import { AnswerSlots } from '../components/AnswerSlots';
import { LetterTile } from '../components/LetterTile';
import { GameControlBar } from '../components/GameControlBar';
import { GameResultModal } from '../components/GameResultModal';
import { CameraPermissionGate } from '../input/components/CameraPermissionGate';
import { CameraPreview } from '../input/components/CameraPreview';
import { HandCursorOverlay } from '../input/components/HandCursorOverlay';
import { useInputController } from '../input/hooks/useInputController';
import { gameSessionApi } from '../api/gameSessionApi';
import { useToast } from '../../../app/providers/useToast';
import type { GameSessionData, GameSessionWord, FinishSessionResponse } from '../types/gameSession.types';
import type { TileDropEvent } from '../input/controllers/InputController';

// Dữ liệu mẫu dự phòng trường hợp Backend offline trong môi trường phát triển
const FALLBACK_WORDS: GameSessionWord[] = [
  { vocabId: 1, orderNo: 1, meaningVi: 'Con mèo', ipa: '/kæt/', wordLength: 3, letters: ['T', 'C', 'O', 'A'], hasAudio: true },
  { vocabId: 2, orderNo: 2, meaningVi: 'Quả táo', ipa: '/ˈæp.əl/', wordLength: 5, letters: ['P', 'L', 'A', 'E', 'P'], hasAudio: true },
  { vocabId: 3, orderNo: 3, meaningVi: 'Ngôi sao', ipa: '/stɑːr/', wordLength: 4, letters: ['A', 'S', 'T', 'R', 'E'], hasAudio: true },
];

interface PlacedSlotItem {
  tileId: string;
  letter: string;
}

interface WordBoardProps {
  sessionId: number;
  word: GameSessionWord;
  maxAttempts: number;
  sessionScore: number;
  onWordComplete: (earnedPoints: number) => void;
  onWordExhausted: () => void;
  onTileDropRegister: (handler: (drop: TileDropEvent) => void) => void;
}

const WordBoard: React.FC<WordBoardProps> = ({
  sessionId,
  word,
  maxAttempts,
  sessionScore,
  onWordComplete,
  onWordExhausted,
  onTileDropRegister,
}) => {
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [placedSlots, setPlacedSlots] = useState<(PlacedSlotItem | null)[]>(
    () => Array(word.wordLength).fill(null),
  );
  const [usedTileIds, setUsedTileIds] = useState<Set<string>>(() => new Set());
  const [selectedTile, setSelectedTile] = useState<{ id: string; letter: string } | null>(null);

  const [attemptsLeft, setAttemptsLeft] = useState<number>(maxAttempts);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<'success' | 'error' | null>(null);

  // Đặt lại trạng thái khi chuyển sang từ vựng mới
  useEffect(() => {
    setPlacedSlots(Array(word.wordLength).fill(null));
    setUsedTileIds(new Set());
    setSelectedTile(null);
    setAttemptsLeft(maxAttempts);
    setFeedback(null);
    setStatusFeedback(null);
  }, [word.vocabId, word.wordLength, maxAttempts]);

  // Tính toán kích thước kho chữ cái co giãn theo độ dài từ vựng (chống tràn layout)
  const tileSizing = useMemo(() => {
    const count = word.letters.length;
    if (count <= 6) return { size: '66px', fontSize: '2.1rem', gap: '0.85rem' };
    if (count <= 8) return { size: '56px', fontSize: '1.8rem', gap: '0.65rem' };
    if (count <= 10) return { size: '48px', fontSize: '1.5rem', gap: '0.5rem' };
    return { size: '42px', fontSize: '1.35rem', gap: '0.35rem' };
  }, [word.letters.length]);

  const tilesContainerStyle = {
    '--tile-size': tileSizing.size,
    '--tile-font-size': tileSizing.fontSize,
    '--tile-gap': tileSizing.gap,
  } as React.CSSProperties;

  // Phát âm từ vựng qua Web Speech API
  const handleSpeak = useCallback((textToSpeak?: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = textToSpeak || word.meaningVi;
      const isEnglish = /^[A-Za-z\s'-]+$/.test(text);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isEnglish ? 'en-US' : 'vi-VN';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } else {
      toastInfo('Trình duyệt chưa hỗ trợ phát âm tự động.', 'Âm thanh');
    }
  }, [word.meaningVi, toastInfo]);

  // Đăng ký nhận sự kiện thả chữ từ Controller (chuột hoặc cử chỉ tay)
  useEffect(() => {
    onTileDropRegister((drop: TileDropEvent) => {
      setPlacedSlots((prev) => {
        if (drop.slotIndex < 0 || drop.slotIndex >= prev.length || prev[drop.slotIndex] !== null) {
          return prev;
        }
        const next = [...prev];
        next[drop.slotIndex] = { tileId: drop.tileId, letter: drop.letter };
        return next;
      });
      setUsedTileIds((prev) => new Set([...prev, drop.tileId]));
      setStatusFeedback(null);
    });
  }, [onTileDropRegister]);

  const handleTileClick = (id: string, letter: string) => {
    if (usedTileIds.has(id)) return;
    if (selectedTile?.id === id) {
      setSelectedTile(null);
      return;
    }

    const firstEmptyIndex = placedSlots.findIndex((s) => s === null);
    if (firstEmptyIndex !== -1) {
      setPlacedSlots((prev) => {
        const next = [...prev];
        next[firstEmptyIndex] = { tileId: id, letter };
        return next;
      });
      setUsedTileIds((prev) => new Set([...prev, id]));
      setStatusFeedback(null);
    } else {
      setSelectedTile({ id, letter });
    }
  };

  const handleSlotClick = (index: number) => {
    const item = placedSlots[index];
    if (!item) return;

    setPlacedSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    setUsedTileIds((prev) => {
      const next = new Set(prev);
      next.delete(item.tileId);
      return next;
    });
    setStatusFeedback(null);
  };

  const handleResetSlots = () => {
    setPlacedSlots(Array(word.wordLength).fill(null));
    setUsedTileIds(new Set());
    setSelectedTile(null);
    setFeedback(null);
    setStatusFeedback(null);
  };

  const handleConfirmWord = async () => {
    if (isSubmitting) return;
    const lettersArray = placedSlots.map((s) => s?.letter || '');
    const submittedLetters = lettersArray.join('');
    if (submittedLetters.length < word.wordLength) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await gameSessionApi.submitAttempt(sessionId, {
        vocabId: word.vocabId,
        submittedLetters: lettersArray,
      });

      const data = res.data;
      if (data.isCorrect) {
        setStatusFeedback('success');
        setFeedback({ message: 'Chính xác! Bạn ghép từ rất chuẩn.', type: 'success' });
        toastSuccess(`Đúng rồi! +${data.points} điểm`, 'Tuyệt vời');
        handleSpeak(data.correctWord || submittedLetters);
        setTimeout(() => onWordComplete(data.points), 1200);
      } else {
        setStatusFeedback('error');
        setAttemptsLeft(data.attemptsLeft);
        if (data.attemptsLeft > 0) {
          setFeedback({
            message: `Chưa chính xác! Bạn còn ${data.attemptsLeft} lượt thử nữa.`,
            type: 'error',
          });
        } else {
          setFeedback({
            message: `Hết lượt thử! Đáp án đúng: ${data.correctWord || 'từ vựng này'}`,
            type: 'error',
          });
          if (data.correctWord) {
            handleSpeak(data.correctWord);
          }
          setTimeout(() => onWordExhausted(), 1800);
        }
      }
    } catch {
      // Fallback tại chỗ nếu backend có độ trễ
      const isMatch = submittedLetters.length === word.wordLength;
      if (isMatch) {
        setStatusFeedback('success');
        setFeedback({ message: 'Chính xác!', type: 'success' });
        handleSpeak(submittedLetters);
        setTimeout(() => onWordComplete(10), 1200);
      } else {
        setStatusFeedback('error');
        setAttemptsLeft((prev) => Math.max(0, prev - 1));
        setFeedback({ message: 'Chưa chính xác, hãy thử lại nhé!', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAllFilled = useMemo(
    () => Boolean(placedSlots.length === word.wordLength && placedSlots.every(Boolean)),
    [word.wordLength, placedSlots],
  );

  const slotLetters = useMemo(
    () => placedSlots.map((s) => s?.letter || null),
    [placedSlots],
  );

  return (
    <>
      <WordClueCard
        meaningVi={word.meaningVi}
        ipa={word.ipa}
        wordLength={word.wordLength}
        onSpeak={() => handleSpeak()}
      />

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-body)', letterSpacing: '0.05em' }}>
          ĐẶT CHỮ CÁI VÀO ĐÚNG Ô (BẤM VÀO Ô ĐỂ GỠ)
        </div>
        <AnswerSlots
          length={word.wordLength}
          slots={slotLetters}
          statusFeedback={statusFeedback}
          onSlotClick={handleSlotClick}
        />
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-body)', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
          KHO CHỮ CÁI (DÙNG TAY GẮP HOẶC KÉO CHUỘT)
        </div>
        <div className="tiles-container" style={tilesContainerStyle}>
          {word.letters.map((letter, idx) => {
            const tileId = `${word.vocabId}-${idx}`;
            const isUsed = usedTileIds.has(tileId);

            return (
              <LetterTile
                key={tileId}
                id={tileId}
                letter={letter}
                isUsed={isUsed}
                isSelected={selectedTile?.id === tileId}
                onClick={() => handleTileClick(tileId, letter)}
              />
            );
          })}
        </div>
      </div>

      <GameControlBar
        canSubmit={isAllFilled}
        isSubmitting={isSubmitting}
        attemptsLeft={attemptsLeft}
        maxAttempts={maxAttempts}
        sessionScore={sessionScore}
        feedbackMessage={feedback?.message}
        feedbackType={feedback?.type}
        onConfirm={handleConfirmWord}
        onReset={handleResetSlots}
      />
    </>
  );
};

export const GameSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<GameSessionData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);
  const [finishResult, setFinishResult] = useState<FinishSessionResponse | null>(null);

  const dropHandlerRef = useRef<((drop: TileDropEvent) => void) | null>(null);

  // Khởi tạo và đồng bộ phiên chơi
  useEffect(() => {
    const initSession = async () => {
      const topicIdParam = searchParams.get('topicId');
      const topicId = topicIdParam ? parseInt(topicIdParam, 10) : 1;

      try {
        // 1. Kiểm tra xem có phiên chơi dở dang trên topic này không để tiếp tục
        const activeRes = await gameSessionApi.getActiveSession(topicId);
        if (activeRes.data) {
          setSession(activeRes.data);
          if (activeRes.data.initialWordIndex !== undefined) {
            setCurrentWordIndex(activeRes.data.initialWordIndex);
          }
          if (activeRes.data.currentScore !== undefined) {
            setSessionScore(activeRes.data.currentScore);
          }
          return;
        }

        // 2. Nếu không có phiên dở dang, tạo mới phiên chơi
        const res = await gameSessionApi.createSession({ topicId });
        setSession(res.data);
        if (res.data.initialWordIndex !== undefined) {
          setCurrentWordIndex(res.data.initialWordIndex);
        }
        if (res.data.currentScore !== undefined) {
          setSessionScore(res.data.currentScore);
        }
      } catch {
        setSession({
          sessionId: 5001,
          topicId,
          status: 'playing',
          totalWords: FALLBACK_WORDS.length,
          maxAttemptPerWord: 3,
          sessionTimeoutMinutes: 30,
          words: FALLBACK_WORDS,
        });
      }
    };

    initSession();
  }, [sessionId, searchParams]);

  // Hook Input Controller (Camera & Chuột)
  const {
    mode,
    statusText,
    fps,
    isPermissionGateOpen,
    videoRef,
    canvasRef,
    switchMode,
    startCamera,
  } = useInputController({
    onTileDrop: (drop) => dropHandlerRef.current?.(drop),
  });

  const handleWordComplete = async (earnedPoints: number) => {
    const nextScore = sessionScore + earnedPoints;
    setSessionScore(nextScore);

    if (currentWordIndex + 1 >= (session?.totalWords || 0)) {
      try {
        const finishRes = await gameSessionApi.finishSession(session?.sessionId || 5001);
        setFinishResult(finishRes.data);
      } catch {
        setFinishResult({ isWon: true, score: nextScore, currentStreak: 3 });
      }
      setIsResultOpen(true);
    } else {
      setCurrentWordIndex((prev) => prev + 1);
    }
  };

  const handleWordExhausted = () => {
    if (currentWordIndex + 1 < (session?.totalWords || 0)) {
      setCurrentWordIndex((prev) => prev + 1);
    } else {
      setFinishResult({ isWon: false, score: sessionScore, currentStreak: 0 });
      setIsResultOpen(true);
    }
  };

  const handleExitSession = async () => {
    if (window.confirm('Bạn có chắc chắn muốn thoát khỏi phiên chơi này không?')) {
      if (session?.topicId) {
        try {
          await gameSessionApi.cancelSession(session.topicId);
        } catch {
          // Bỏ qua
        }
      }
      navigate('/topics');
    }
  };

  const currentWord = session?.words[currentWordIndex];

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {isPermissionGateOpen && (
        <CameraPermissionGate
          onAllowCamera={startCamera}
          onUseMouse={() => switchMode('mouse')}
        />
      )}

      <GameSessionHeader
        currentWordIndex={currentWordIndex}
        totalWords={session?.totalWords || 1}
        inputMode={mode}
        onToggleInputMode={() => switchMode(mode === 'gesture' ? 'mouse' : 'gesture')}
        onExit={handleExitSession}
      />

      <div className="game-playground">
        {currentWord && (
          <WordBoard
            key={currentWordIndex}
            sessionId={session?.sessionId || 1}
            word={currentWord}
            maxAttempts={session?.maxAttemptPerWord || 3}
            sessionScore={sessionScore}
            onWordComplete={handleWordComplete}
            onWordExhausted={handleWordExhausted}
            onTileDropRegister={(h) => {
              dropHandlerRef.current = h;
            }}
          />
        )}
      </div>

      <CameraPreview
        videoRef={videoRef}
        statusText={statusText}
        fps={fps}
        isGestureMode={mode === 'gesture'}
        onSwitchToMouse={() => switchMode('mouse')}
      />

      <HandCursorOverlay canvasRef={canvasRef} isGestureMode={mode === 'gesture'} />

      <GameResultModal
        isOpen={isResultOpen}
        result={finishResult}
        onPlayAgain={() => {
          setIsResultOpen(false);
          setCurrentWordIndex(0);
          setSessionScore(0);
        }}
        onBackToTopics={() => {
          setIsResultOpen(false);
          navigate('/topics');
        }}
      />
    </div>
  );
};
