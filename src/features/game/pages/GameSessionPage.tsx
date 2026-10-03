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
import { nearestRectIndex } from '../input/utils/gestureRecognition';
import type { GameSessionData, GameSessionWord, FinishSessionResponse } from '../types/gameSession.types';
import type { CursorPosition } from '../input/controllers/InputController';

// Dữ liệu mẫu dự phòng trường hợp Backend offline trong môi trường phát triển
const FALLBACK_WORDS: GameSessionWord[] = [
  { vocabId: 1, orderNo: 1, meaningVi: 'Con mèo', ipa: '/kæt/', wordLength: 3, letters: ['T', 'C', 'O', 'A'], hasAudio: true },
  { vocabId: 2, orderNo: 2, meaningVi: 'Quả táo', ipa: '/ˈæp.əl/', wordLength: 5, letters: ['P', 'L', 'A', 'E', 'P'], hasAudio: true },
  { vocabId: 3, orderNo: 3, meaningVi: 'Ngôi sao', ipa: '/stɑːr/', wordLength: 4, letters: ['A', 'S', 'T', 'R', 'E'], hasAudio: true },
];

interface WordBoardProps {
  word: GameSessionWord;
  maxAttempts: number;
  sessionScore: number;
  onWordComplete: (earnedPoints: number) => void;
  onWordExhausted: () => void;
  onTileGrabRegister: (handler: (c: CursorPosition) => void) => void;
  onTileReleaseRegister: (handler: (c: CursorPosition) => void) => void;
  onCursorMoveRegister: (handler: (c: CursorPosition) => void) => void;
}

const WordBoard: React.FC<WordBoardProps> = ({
  word,
  maxAttempts,
  sessionScore,
  onWordComplete,
  onWordExhausted,
  onTileGrabRegister,
  onTileReleaseRegister,
  onCursorMoveRegister,
}) => {
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [placedSlots, setPlacedSlots] = useState<(string | null)[]>(() => Array(word.wordLength).fill(null));
  const [usedTileIds, setUsedTileIds] = useState<Set<string>>(() => new Set());
  const [selectedTile, setSelectedTile] = useState<{ id: string; letter: string } | null>(null);

  const [dragGhost, setDragGhost] = useState<{ letter: string; x: number; y: number } | null>(null);
  const [targetedSlotIndex, setTargetedSlotIndex] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(maxAttempts);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Phát âm từ vựng qua Web Speech API
  const handleSpeak = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.meaningVi);
      utterance.lang = 'en-US';
      utterance.rate = 0.82;
      window.speechSynthesis.speak(utterance);
    } else {
      toastInfo('Trình duyệt chưa hỗ trợ phát âm tự động.', 'Âm thanh');
    }
  }, [word.meaningVi, toastInfo]);

  // Tìm ô slot lân cận vị trí con trỏ
  const findTargetedSlot = useCallback((x: number, y: number): number | null => {
    const slotElements = document.querySelectorAll<HTMLElement>('.game-slot');
    if (!slotElements.length) return null;
    const rects = Array.from(slotElements).map((el) => el.getBoundingClientRect());
    const bestIdx = nearestRectIndex(rects, x, y, 35);
    return bestIdx >= 0 ? bestIdx : null;
  }, []);

  // Đăng ký các sự kiện kéo thả từ InputController
  useEffect(() => {
    onCursorMoveRegister((cursor) => {
      setDragGhost((prev) => (prev ? { ...prev, x: cursor.x, y: cursor.y } : null));
      const slotIdx = findTargetedSlot(cursor.x, cursor.y);
      setTargetedSlotIndex(slotIdx);
    });

    onTileGrabRegister((cursor) => {
      const tileElements = document.querySelectorAll<HTMLElement>('.game-tile:not(.used)');
      if (!tileElements.length) return;
      const rects = Array.from(tileElements).map((el) => el.getBoundingClientRect());
      const bestIdx = nearestRectIndex(rects, cursor.x, cursor.y, 40);

      if (bestIdx >= 0) {
        const targetEl = tileElements[bestIdx];
        const tileId = targetEl.dataset.id;
        const letter = targetEl.textContent?.trim() || '';

        if (tileId && letter && !usedTileIds.has(tileId)) {
          setSelectedTile({ id: tileId, letter });
          setDragGhost({ letter, x: cursor.x, y: cursor.y });
        }
      }
    });

    onTileReleaseRegister((cursor) => {
      setDragGhost(null);
      setTargetedSlotIndex(null);

      if (selectedTile) {
        const slotIdx = findTargetedSlot(cursor.x, cursor.y);
        if (slotIdx !== null && slotIdx < placedSlots.length && !placedSlots[slotIdx]) {
          setPlacedSlots((prev) => {
            const next = [...prev];
            next[slotIdx] = selectedTile.letter;
            return next;
          });
          setUsedTileIds((prev) => new Set([...prev, selectedTile.id]));
        }
        setSelectedTile(null);
      }
    });
  }, [findTargetedSlot, onCursorMoveRegister, onTileGrabRegister, onTileReleaseRegister, placedSlots, selectedTile, usedTileIds]);

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
        next[firstEmptyIndex] = letter;
        return next;
      });
      setUsedTileIds((prev) => new Set([...prev, id]));
    } else {
      setSelectedTile({ id, letter });
    }
  };

  const handleSlotClick = (index: number) => {
    const letter = placedSlots[index];
    if (!letter) return;

    setPlacedSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    const matchingUsedId = Array.from(usedTileIds).find((id) => {
      const tileIndex = parseInt(id.split('-')[1], 10);
      return word.letters[tileIndex] === letter;
    });

    if (matchingUsedId) {
      setUsedTileIds((prev) => {
        const next = new Set(prev);
        next.delete(matchingUsedId);
        return next;
      });
    }
  };

  const handleResetSlots = () => {
    setPlacedSlots(Array(word.wordLength).fill(null));
    setUsedTileIds(new Set());
    setSelectedTile(null);
    setFeedback(null);
  };

  const handleConfirmWord = async () => {
    if (isSubmitting) return;
    const submittedLetters = placedSlots.join('');
    if (submittedLetters.length < word.wordLength) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await gameSessionApi.submitAttempt(5001, {
        vocabId: word.vocabId,
        submittedLetters,
      });

      const data = res.data;
      if (data.isCorrect) {
        setFeedback({ message: 'Chính xác! Bạn ghép từ rất chuẩn.', type: 'success' });
        toastSuccess(`Đúng rồi! +${data.points} điểm`, 'Tuyệt vời');
        handleSpeak();
        setTimeout(() => onWordComplete(data.points), 1100);
      } else {
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
          setTimeout(() => onWordExhausted(), 1800);
        }
      }
    } catch {
      // Fallback tại chỗ nếu backend offline
      const isMatch = submittedLetters.length === word.wordLength;
      if (isMatch) {
        setFeedback({ message: 'Chính xác!', type: 'success' });
        handleSpeak();
        setTimeout(() => onWordComplete(10), 1100);
      } else {
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

  return (
    <>
      <WordClueCard meaningVi={word.meaningVi} ipa={word.ipa} onSpeak={handleSpeak} />

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-body)', letterSpacing: '0.05em' }}>
          ĐẶT CHỮ CÁI VÀO ĐÚNG Ô
        </div>
        <AnswerSlots
          length={word.wordLength}
          slots={placedSlots}
          targetedIndex={targetedSlotIndex}
          onSlotClick={handleSlotClick}
        />
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-body)', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
          KHO CHỮ CÁI (DÙNG TAY GẮP HOẶC KÉO CHUỘT)
        </div>
        <div className="tiles-container">
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

      {dragGhost && (
        <div
          className="drag-ghost"
          style={{
            left: `${dragGhost.x}px`,
            top: `${dragGhost.y}px`,
          }}
        >
          {dragGhost.letter}
        </div>
      )}
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

  const moveHandlerRef = useRef<((c: CursorPosition) => void) | null>(null);
  const grabHandlerRef = useRef<((c: CursorPosition) => void) | null>(null);
  const releaseHandlerRef = useRef<((c: CursorPosition) => void) | null>(null);

  // Khởi tạo và đồng bộ phiên chơi
  useEffect(() => {
    const initSession = async () => {
      const topicIdParam = searchParams.get('topicId');
      const topicId = topicIdParam ? parseInt(topicIdParam, 10) : 1;

      try {
        if (sessionId && sessionId !== 'new') {
          const res = await gameSessionApi.getCurrentSession();
          if (res.data) {
            setSession(res.data);
            return;
          }
        }
        const res = await gameSessionApi.createSession({ topicId });
        setSession(res.data);
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
    onCursorMove: (c) => moveHandlerRef.current?.(c),
    onTileGrab: (c) => grabHandlerRef.current?.(c),
    onTileRelease: (c) => releaseHandlerRef.current?.(c),
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
      if (session?.sessionId) {
        try {
          await gameSessionApi.cancelSession(session.sessionId);
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
            word={currentWord}
            maxAttempts={session?.maxAttemptPerWord || 3}
            sessionScore={sessionScore}
            onWordComplete={handleWordComplete}
            onWordExhausted={handleWordExhausted}
            onCursorMoveRegister={(h) => { moveHandlerRef.current = h; }}
            onTileGrabRegister={(h) => { grabHandlerRef.current = h; }}
            onTileReleaseRegister={(h) => { releaseHandlerRef.current = h; }}
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
