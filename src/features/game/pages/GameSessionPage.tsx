import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { loadGameRoute } from '../api/loadGameRoute';
import { useVocabularyAudio } from '../hooks/useVocabularyAudio';
import { useToast } from '../../../app/providers/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import { progressKeys, useMyStreak } from '../../progress/hooks/useMyStreak';
import type { GameSessionData, GameSessionWord, FinishSessionResponse, SubmitAttemptResponse } from '../types/gameSession.types';
import type { TileDropEvent } from '../input/controllers/InputController';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.';

interface PlacedSlotItem { tileId: string; letter: string }
interface WordBoardProps {
  session: GameSessionData;
  word: GameSessionWord;
  sessionScore: number;
  isSyncing: boolean;
  onAttempt: (attempt: SubmitAttemptResponse) => void;
  onContinue: (attempt: SubmitAttemptResponse) => void;
  onRecover: () => Promise<void>;
  onPendingChange?: (pending: boolean) => void;
  onTileDropRegister: (handler: ((drop: TileDropEvent) => void) | null) => void;
}

export function WordBoard({ session, word, sessionScore, isSyncing, onAttempt, onContinue, onRecover, onTileDropRegister, onPendingChange }: WordBoardProps) {
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [placedSlots, setPlacedSlots] = useState<(PlacedSlotItem | null)[]>(() => Array(word.wordLength).fill(null));
  const [attemptsLeft, setAttemptsLeft] = useState(word.remainingAttempts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<'success' | 'error' | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocked = isSubmitting || isTransitioning || needsSync || isSyncing;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
      onPendingChange?.(false);
    };
  }, [onPendingChange]);

  const refreshAudioUrl = useCallback(() => gameSessionApi.refreshAudioUrl(session.topicId, session.sessionId, word.vocabId), [session.topicId, session.sessionId, word.vocabId]);
  const reportAudioError = useCallback((message: string) => toastInfo(message, 'Âm thanh'), [toastInfo]);
  const { speak, isSpeaking } = useVocabularyAudio(`${session.sessionId}:${word.vocabId}`, word.audioUrl, refreshAudioUrl, reportAudioError);

  useEffect(() => {
    onTileDropRegister((drop) => {
      if (isLocked || busy.current) return;
      const tileIndex = word.letters.findIndex((letter, index) => `${word.vocabId}-${index}` === drop.tileId && letter === drop.letter);
      if (tileIndex < 0) return;
      setPlacedSlots((previous) => {
        if (drop.slotIndex < 0 || drop.slotIndex >= previous.length || previous[drop.slotIndex] || previous.some((slot) => slot?.tileId === drop.tileId)) return previous;
        const next = [...previous];
        next[drop.slotIndex] = { tileId: drop.tileId, letter: drop.letter };
        return next;
      });
      setStatusFeedback(null);
    });
    return () => onTileDropRegister(null);
  }, [onTileDropRegister, word, isLocked]);

  const handleTileClick = (id: string, letter: string) => {
    if (isLocked || busy.current) return;
    setPlacedSlots((previous) => {
      if (previous.some((slot) => slot?.tileId === id)) return previous;
      const firstEmpty = previous.indexOf(null);
      if (firstEmpty < 0) return previous;
      const next = [...previous];
      next[firstEmpty] = { tileId: id, letter };
      return next;
    });
    setStatusFeedback(null);
  };
  const handleSlotClick = (index: number) => {
    if (isLocked || busy.current) return;
    setPlacedSlots((previous) => previous.map((slot, slotIndex) => slotIndex === index ? null : slot));
    setStatusFeedback(null);
  };
  const handleResetSlots = () => {
    if (isLocked || busy.current) return;
    setPlacedSlots(Array(word.wordLength).fill(null));
    setFeedback(null);
    setStatusFeedback(null);
  };
  const isAllFilled = placedSlots.length === word.wordLength && placedSlots.every(Boolean);
  const handleConfirmWord = async () => {
    if (isLocked || busy.current || !isAllFilled || attemptsLeft <= 0) return;
    busy.current = true;
    onPendingChange?.(true);
    setIsSubmitting(true);
    setFeedback(null);
    let awaitingTransition = false;
    try {
      const { data } = await gameSessionApi.submitAttempt(session.sessionId, { vocabId: word.vocabId, submittedLetters: placedSlots.map((slot) => slot!.letter) });
      if (!mounted.current) return;
      setAttemptsLeft(data.attemptsLeft);
      onAttempt(data);
      setStatusFeedback(data.isCorrect ? 'success' : 'error');
      if (data.isCorrect) {
        setFeedback({ message: 'Chính xác! Bạn ghép từ rất chuẩn.', type: 'success' });
        toastSuccess(`Đúng rồi! +${data.points} điểm`, 'Tuyệt vời');
        speak();
      } else {
        setFeedback({ message: data.wordDone || data.sessionDone
          ? `Hết lượt thử!${data.correctWord ? ` Đáp án đúng: ${data.correctWord}` : ''}`
          : `Chưa chính xác! Bạn còn ${data.attemptsLeft} lượt thử nữa.`, type: 'error' });
      }
      if (data.wordDone || data.sessionDone) {
        awaitingTransition = true;
        setIsTransitioning(true);
        transitionTimer.current = setTimeout(() => { onPendingChange?.(false); onContinue(data); }, data.isCorrect ? 1200 : 1800);
      } else {
        busy.current = false;
      }
    } catch (error) {
      if (!mounted.current) return;
      // The server may have committed an attempt before a timeout. Read state before another POST.
      setNeedsSync(true);
      setStatusFeedback('error');
      setFeedback({ message: `${errorMessage(error)} Hãy đồng bộ phiên trước khi tiếp tục.`, type: 'error' });
    } finally {
      if (mounted.current) {
        setIsSubmitting(false);
        if (!awaitingTransition) onPendingChange?.(false);
      }
    }
  };
  const tileSize = word.letters.length <= 6 ? '66px' : word.letters.length <= 8 ? '56px' : '42px';
  const tilesStyle = { '--tile-size': tileSize, '--tile-font-size': word.letters.length <= 6 ? '2.1rem' : '1.5rem', '--tile-gap': '0.5rem' } as CSSProperties;

  return <>
    <WordClueCard meaningVi={word.meaningVi} ipa={word.ipa} wordLength={word.wordLength} onSpeak={speak} hasAudio={Boolean(word.audioUrl?.trim())} isSpeaking={isSpeaking} />
    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
      <p style={{ fontWeight: 800 }}>ĐẶT CHỮ CÁI VÀO ĐÚNG Ô (BẤM VÀO Ô ĐỂ GỠ)</p>
      <AnswerSlots length={word.wordLength} slots={placedSlots.map((slot) => slot?.letter ?? null)} statusFeedback={statusFeedback} onSlotClick={handleSlotClick} />
    </div>
    <div style={{ marginTop: '1.5rem' }}>
      <p style={{ fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem' }}>KHO CHỮ CÁI (DÙNG TAY GẮP HOẶC KÉO CHUỘT)</p>
      <div className="tiles-container" style={tilesStyle}>
        {word.letters.map((letter, index) => {
          const tileId = `${word.vocabId}-${index}`;
          return <LetterTile key={tileId} id={tileId} letter={letter} isUsed={placedSlots.some((slot) => slot?.tileId === tileId)} onClick={() => handleTileClick(tileId, letter)} />;
        })}
      </div>
    </div>
    <GameControlBar canSubmit={isAllFilled && !isLocked && attemptsLeft > 0} isSubmitting={isSubmitting} isLocked={isLocked} attemptsLeft={attemptsLeft} maxAttempts={session.maxAttemptPerWord} sessionScore={sessionScore} feedbackMessage={feedback?.message} feedbackType={feedback?.type} onConfirm={handleConfirmWord} onReset={handleResetSlots} />
    {needsSync && <button type="button" className="btn-outline" disabled={isSyncing} onClick={() => void onRecover()} style={{ marginTop: '1rem' }}>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ phiên để tiếp tục'}</button>}
  </>;
}

function GamePlay({ initialSession }: { initialSession: GameSessionData }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const streak = useMyStreak(user?.id);
  const [session, setSession] = useState(initialSession);
  const [currentWordIndex, setCurrentWordIndex] = useState(initialSession.initialWordIndex ?? 0);
  const [sessionScore, setSessionScore] = useState(initialSession.currentScore ?? 0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<FinishSessionResponse | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isAttemptPending, setIsAttemptPending] = useState(false);
  const pendingAttemptRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const onPendingChange = useCallback((pending: boolean) => {
    pendingAttemptRef.current = pending;
    if (alive.current) setIsAttemptPending(pending);
  }, []);
  const dropHandlerRef = useRef<((drop: TileDropEvent) => void) | null>(null);
  const operationPending = useRef(false);
  const registerDrop = useCallback((handler: ((drop: TileDropEvent) => void) | null) => { dropHandlerRef.current = handler; }, []);
  const input = useInputController({ onTileDrop: (drop) => dropHandlerRef.current?.(drop) });
  const { switchMode } = input;
  useEffect(() => {
    if (isFinished) void switchMode('mouse');
  }, [isFinished, switchMode]);

  const refreshProgress = () => {
    void queryClient.invalidateQueries({ queryKey: progressKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['topics'] });
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  };
  const applySession = (next: GameSessionData) => {
    setSession(next);
    setCurrentWordIndex(next.initialWordIndex ?? 0);
    setSessionScore(next.currentScore ?? 0);
    setRevision((value) => value + 1);
    setSessionError(null);
  };
  const recoverSession = async () => {
    if (operationPending.current) return;
    operationPending.current = true;
    setIsSyncing(true);
    setSessionError(null);
    try {
      const { data: active } = await gameSessionApi.getActiveSession(session.topicId);
      if (!alive.current) return;
      if (active?.sessionId === session.sessionId) {
        applySession(active);
      } else {
        const { data } = await gameSessionApi.getSessionResult(session.sessionId);
        if (!alive.current) return;
        setResult(data);
        setIsFinished(true);
        refreshProgress();
      }
    } catch (error) { if (alive.current) setSessionError(errorMessage(error)); }
    finally { operationPending.current = false; if (alive.current) setIsSyncing(false); }
  };
  const handleAttempt = (attempt: SubmitAttemptResponse) => {
    setSessionScore(attempt.sessionScore);
    if (attempt.wordDone || attempt.sessionDone) refreshProgress();
  };
  const handleContinue = (attempt: SubmitAttemptResponse) => {
    if (attempt.sessionDone) {
      setIsFinished(true);
      if (typeof attempt.sessionWon === 'boolean') {
        setResult({ isWon: attempt.sessionWon, score: attempt.sessionScore, currentStreak: attempt.currentStreak ?? null });
      } else {
        void recoverSession();
      }
      return;
    }
    const nextIndex = session.words.findIndex((word) => word.vocabId === attempt.nextVocabularyId);
    if (nextIndex >= 0 && nextIndex !== currentWordIndex) {
      setCurrentWordIndex(nextIndex);
    } else {
      void recoverSession();
    }
  };
  const handleRestart = async () => {
    if (operationPending.current) return;
    operationPending.current = true;
    setIsRestarting(true);
    setSessionError(null);
    try {
      const { data } = await gameSessionApi.createSession({ topicId: session.topicId, mode: session.mode });
      if (!alive.current) return;
      applySession(data);
      setResult(null);
      setIsFinished(false);
    } catch (error) { if (alive.current) setSessionError(errorMessage(error)); }
    finally { operationPending.current = false; if (alive.current) setIsRestarting(false); }
  };
  const handleExit = async () => {
    if (operationPending.current || pendingAttemptRef.current || !window.confirm('Bạn có chắc chắn muốn thoát khỏi phiên chơi này không?')) return;
    operationPending.current = true;
    setIsExiting(true);
    setSessionError(null);
    try {
      await gameSessionApi.cancelSession(session.topicId);
      if (alive.current) { refreshProgress(); navigate('/topics'); }
    } catch (error) { if (alive.current) setSessionError(errorMessage(error)); }
    finally { operationPending.current = false; if (alive.current) setIsExiting(false); }
  };
  const currentWord = session.words[currentWordIndex];
  const displayedResult = result ? { ...result, currentStreak: result.currentStreak ?? streak.data?.currentStreak ?? null } : null;

  return <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1rem 0 3rem' }}>
    {input.isPermissionGateOpen && !isFinished && <CameraPermissionGate onAllowCamera={input.startCamera} onUseMouse={() => void input.switchMode('mouse')} />}
    <GameSessionHeader currentWordIndex={currentWordIndex} totalWords={session.totalWords} inputMode={input.mode} isSwitching={input.isStarting} isExitDisabled={isAttemptPending || isExiting || isSyncing} onToggleInputMode={() => void input.switchMode(input.mode === 'gesture' ? 'mouse' : 'gesture')} onExit={() => void handleExit()} />
    {input.inputError && <div role="alert" style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>{input.inputError} <button type="button" className="btn-outline" disabled={input.isStarting} onClick={() => void input.switchMode('gesture')}>Thử bật camera lại</button></div>}
    {sessionError && !isFinished && <div role="alert" style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>{sessionError} <button type="button" className="btn-outline" disabled={isSyncing} onClick={() => void recoverSession()}>Đồng bộ lại</button></div>}
    {isExiting && <p role="status">Đang thoát phiên chơi...</p>}
    <div className="game-playground" aria-busy={isSyncing}>
      {!isFinished && currentWord && <WordBoard key={`${session.sessionId}:${currentWord.vocabId}:${revision}`} session={session} word={currentWord} sessionScore={sessionScore} isSyncing={isSyncing || isExiting} onAttempt={handleAttempt} onContinue={handleContinue} onRecover={recoverSession} onTileDropRegister={registerDrop} onPendingChange={onPendingChange} />}
      {!isFinished && !currentWord && <div role="alert">Phiên chơi không có câu hỏi hiện tại. <button type="button" className="btn-outline" disabled={isSyncing} onClick={() => void recoverSession()}>Tải lại phiên</button></div>}
    </div>
    <CameraPreview videoRef={input.videoRef} statusText={input.statusText} fps={input.fps} isGestureMode={input.mode === 'gesture' && !isFinished} onSwitchToMouse={() => void input.switchMode('mouse')} />
    <HandCursorOverlay canvasRef={input.canvasRef} isGestureMode={input.mode === 'gesture' && !isFinished} />
    <GameResultModal isOpen={isFinished} result={displayedResult} isLoading={isSyncing} error={sessionError} isRestarting={isRestarting} onRetry={() => void recoverSession()} onPlayAgain={() => void handleRestart()} onBackToTopics={() => navigate('/topics')} />
  </div>;
}

export function GameSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const topicId = searchParams.get('topicId');
  const streak = useMyStreak(user?.id);
  const mode = searchParams.get('mode');
  const game = useQuery({
    queryKey: ['game-session', user?.id, sessionId, topicId, mode],
    queryFn: () => loadGameRoute(sessionId, topicId, mode),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (game.isPending) return <p role="status" style={{ padding: '3rem', textAlign: 'center' }}>Đang tải phiên chơi từ máy chủ...</p>;
  if (game.isError) return <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Chưa thể mở phiên chơi</h1><p>{errorMessage(game.error)}</p>
    <button type="button" className="btn-3d" onClick={() => void game.refetch()}>Thử lại</button>{' '}
    <button type="button" className="btn-outline" onClick={() => navigate('/topics')}>Về danh sách chủ đề</button>
  </div>;
  if (game.data.kind === 'history') {
    const history = game.data;
    return <GameResultModal isOpen result={{ ...history.result, currentStreak: streak.data?.currentStreak ?? null }} onPlayAgain={() => navigate(`/game/new?topicId=${history.topicId}&mode=${history.mode}`)} onBackToTopics={() => navigate('/topics')} />;
  }
  return <GamePlay key={game.data.session.sessionId} initialSession={game.data.session} />;
}
