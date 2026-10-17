import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Hash,
  Loader2,
  Play,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { PageHeading } from '../../../components/common/PageHeading';
import { useToast } from '../../../app/providers/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import { useVocabularyAudio } from '../../game/hooks/useVocabularyAudio';
import { progressKeys } from '../../progress/hooks/useMyStreak';
import { learningApi } from '../api/learningApi';
import {
  WORDS_PER_CHECKPOINT,
  type LearningMode,
  type LearningResponse,
  type LearningVocabularyItem,
} from '../types/learning.types';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.';

const positiveId = (value: string | undefined) =>
  value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

const MODE_BADGE_LABELS: Record<LearningMode, { text: string; bg: string; color: string }> = {
  NEW: { text: 'Bắt đầu học mới', bg: 'var(--color-pastel-lavender)', color: 'var(--color-brand-primary)' },
  LEARNING: { text: 'Đang học theo nhóm 5 từ', bg: 'var(--color-pastel-blue, #dbeafe)', color: 'var(--color-brand-primary)' },
  CHECKPOINT_REQUIRED: { text: 'Đã thuộc đủ 5 từ — Sẵn sàng chơi thử thách!', bg: 'var(--color-pastel-mint)', color: '#1f7a55' },
  REVIEW: { text: 'Đã hoàn thành toàn bộ chủ đề (Ôn tập)', bg: 'var(--color-pastel-yellow)', color: '#8e641d' },
};

interface BatchComputed {
  batchNumber: number;
  batchStartPos: number;
  batchEndPos: number;
  batchWords: LearningVocabularyItem[];
  batchIndexInVocabs: number;
}

function computeCurrentBatch(
  learning: LearningResponse,
  selectedBatchIdx: number | null,
): { current: BatchComputed; totalBatches: number } {
  const vocabs = learning.vocabularies;
  if (vocabs.length === 0) {
    return {
      current: { batchNumber: 1, batchStartPos: 1, batchEndPos: 0, batchWords: [], batchIndexInVocabs: 0 },
      totalBatches: 0,
    };
  }
  const totalBatches = Math.ceil(vocabs.length / WORDS_PER_CHECKPOINT);
  const defaultBatchIdx = Math.max(0, totalBatches - 1);
  const activeBatchIdx =
    selectedBatchIdx !== null && selectedBatchIdx >= 0 && selectedBatchIdx < totalBatches
      ? selectedBatchIdx
      : defaultBatchIdx;
  const startIdx = activeBatchIdx * WORDS_PER_CHECKPOINT;
  const batchWords = vocabs.slice(startIdx, startIdx + WORDS_PER_CHECKPOINT);
  return {
    current: {
      batchNumber: activeBatchIdx + 1,
      batchStartPos: startIdx + 1,
      batchEndPos: startIdx + batchWords.length,
      batchWords,
      batchIndexInVocabs: startIdx,
    },
    totalBatches,
  };
}

export const TopicLearningPage: React.FC = () => {
  const { topicId: topicParam } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success: toastSuccess, info: toastInfo } = useToast();
  const topicId = positiveId(topicParam);

  const learningQuery = useQuery({
    queryKey: ['topics', 'learning', user?.id, topicId],
    queryFn: async ({ signal }) => {
      if (!topicId) throw new Error('Mã chủ đề không hợp lệ.');
      return (await learningApi.getTopicLearning(topicId, signal)).data;
    },
    enabled: topicId !== null,
    retry: false,
  });

  const [furthestOverride, setFurthestOverride] = useState<{ topicId: number; pos: number | null } | null>(null);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | null>(null);
  const [cardIndexState, setCardIndexState] = useState<{ topicId: number; index: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const learning = learningQuery.data;
  const effectiveFurthestPos =
    learning && furthestOverride?.topicId === learning.topicId
      ? furthestOverride.pos
      : (learning?.furthestPosition ?? null);

  const { current: batch, totalBatches } = useMemo(
    () =>
      learning
        ? computeCurrentBatch(learning, selectedBatchIdx)
        : {
            current: { batchNumber: 1, batchStartPos: 1, batchEndPos: 0, batchWords: [], batchIndexInVocabs: 0 },
            totalBatches: 0,
          },
    [learning, selectedBatchIdx],
  );

  const defaultCardIndex = useMemo(() => {
    if (!learning || learning.startVocabId === null) return 0;
    const idx = batch.batchWords.findIndex((item) => item.id === learning.startVocabId);
    return idx >= 0 ? idx : 0;
  }, [learning, batch.batchWords]);

  const cardIndex =
    learning && cardIndexState?.topicId === learning.topicId
      ? cardIndexState.index
      : defaultCardIndex;

  const setCardIndex = (index: number) => {
    if (!learning) return;
    setCardIndexState({ topicId: learning.topicId, index });
  };

  const currentWord = batch.batchWords[cardIndex] ?? batch.batchWords[0] ?? null;

  const refreshAudioUrl = useCallback(
    () =>
      topicId && currentWord
        ? learningApi.refreshVocabularyAudioUrl(topicId, currentWord.id)
        : Promise.resolve(null),
    [topicId, currentWord],
  );
  const reportAudioError = useCallback((message: string) => toastInfo(message, 'Âm thanh'), [toastInfo]);
  const { speak, isSpeaking } = useVocabularyAudio(
    `${topicId ?? 0}:${currentWord?.id ?? 0}`,
    currentWord?.audioUrl,
    refreshAudioUrl,
    reportAudioError,
  );

  /**
   * Ensure sequential progress saving up to `targetGlobalPosition` (1-based index in `learning.vocabularies`).
   * Backend requires advancing 1 vocabulary at a time starting from position 1.
   */
  const advanceProgressUpTo = async (targetGlobalPosition: number): Promise<number> => {
    if (!learning || !topicId) return 0;
    const currentPos = effectiveFurthestPos ?? 0;
    if (targetGlobalPosition <= currentPos) return currentPos;

    setIsSaving(true);
    setSaveError(null);
    let latestPos = currentPos;
    try {
      for (let pos = currentPos + 1; pos <= targetGlobalPosition; pos += 1) {
        const vocab = learning.vocabularies[pos - 1];
        if (!vocab) break;
        const { data } = await learningApi.saveLearningProgress(topicId, { vocabId: vocab.id });
        latestPos = data.furthestPosition;
        setFurthestOverride({ topicId: learning.topicId, pos: latestPos });
      }
      void queryClient.invalidateQueries({ queryKey: progressKeys.all });
      return latestPos;
    } catch (error) {
      setSaveError(errorMessage(error));
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCard = async (nextIdx: number) => {
    if (!learning || isSaving || nextIdx < 0 || nextIdx >= batch.batchWords.length) return;
    // If jumping forward to a word, ensure preceding words up to current card are saved first
    const currentGlobalPos = batch.batchIndexInVocabs + cardIndex + 1;
    const targetGlobalPos = batch.batchIndexInVocabs + nextIdx + 1;
    const currentSaved = effectiveFurthestPos ?? 0;
    if (targetGlobalPos > currentSaved + 1) {
      try {
        await advanceProgressUpTo(targetGlobalPos - 1);
      } catch {
        return;
      }
    } else if (nextIdx > cardIndex && currentGlobalPos > currentSaved) {
      try {
        await advanceProgressUpTo(currentGlobalPos);
      } catch {
        return;
      }
    }
    setCardIndex(nextIdx);
  };

  const handleCompleteCurrentWordAndNext = async () => {
    if (!learning || !currentWord || isSaving) return;
    const currentGlobalPos = batch.batchIndexInVocabs + cardIndex + 1;
    try {
      await advanceProgressUpTo(currentGlobalPos);
      if (cardIndex + 1 < batch.batchWords.length) {
        setCardIndex(cardIndex + 1);
      } else {
        toastSuccess(
          `Đã học xong ${batch.batchWords.length} từ vựng của nhóm ${batch.batchNumber}! Hãy bấm "Chơi ngay 5 từ này" để vượt thử thách.`,
          learning.topicName,
        );
      }
    } catch {
      // Error already stored in saveError
    }
  };

  const handlePlayCurrentBatch = async () => {
    if (!learning || !topicId || isSaving) return;
    try {
      // Ensure all words in the current batch are marked as studied before starting CHECKPOINT
      await advanceProgressUpTo(batch.batchEndPos);
      void queryClient.invalidateQueries({ queryKey: ['topics', 'learning', user?.id, topicId] });
      const targetMode = learning.completed || learning.mode === 'REVIEW' ? 'REVIEW' : 'CHECKPOINT';
      toastSuccess(
        targetMode === 'CHECKPOINT'
          ? `Bắt đầu chơi kiểm tra ${batch.batchWords.length} từ vựng vừa học!`
          : 'Bắt đầu phiên Ôn tập (REVIEW) cho chủ đề này!',
        learning.topicName,
      );
      navigate(`/game/new?topicId=${topicId}&mode=${targetMode}`);
    } catch {
      // Error already displayed in saveError
    }
  };

  if (!topicId) {
    return (
      <div role="alert" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <h1>Đường dẫn chủ đề không hợp lệ</h1>
        <button type="button" className="btn-3d" onClick={() => navigate('/topics')}>
          Quay lại danh sách chủ đề
        </button>
      </div>
    );
  }

  if (learningQuery.isPending) {
    return (
      <div role="status" style={{ padding: '3.5rem 1rem', textAlign: 'center', fontWeight: 700 }}>
        Đang tải danh sách từ vựng của chủ đề...
      </div>
    );
  }

  if (learningQuery.isError || !learning) {
    return (
      <div role="alert" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
          Chưa thể tải bài học từ vựng
        </h1>
        <p style={{ margin: '0.75rem 0 1.5rem', color: 'var(--color-error)', fontWeight: 700 }}>
          {errorMessage(learningQuery.error)}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-3d" onClick={() => void learningQuery.refetch()}>
            Tải lại bài học
          </button>
          <button type="button" className="btn-outline" onClick={() => navigate('/topics')}>
            Về danh sách chủ đề
          </button>
        </div>
      </div>
    );
  }

  const currentGlobalPos = batch.batchIndexInVocabs + cardIndex + 1;
  const isCurrentWordLearned = (effectiveFurthestPos ?? 0) >= currentGlobalPos;
  const isBatchCompleted =
    learning.mode === 'CHECKPOINT_REQUIRED' ||
    learning.mode === 'REVIEW' ||
    learning.completed ||
    (batch.batchEndPos > 0 && (effectiveFurthestPos ?? 0) >= batch.batchEndPos);

  const EffectiveMode: LearningMode =
    learning.completed || learning.mode === 'REVIEW'
      ? 'REVIEW'
      : isBatchCompleted
        ? 'CHECKPOINT_REQUIRED'
        : (effectiveFurthestPos ?? 0) > 0
          ? 'LEARNING'
          : 'NEW';
  const badge = MODE_BADGE_LABELS[EffectiveMode];
  const isLastCardInBatch = cardIndex >= batch.batchWords.length - 1;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 0 4rem' }}>
      {/* Thanh điều hướng quay lại */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => navigate('/topics')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Chủ đề</span>
        </button>

        <span
          style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '999px',
            backgroundColor: badge.bg,
            color: badge.color,
            fontSize: '0.825rem',
            fontWeight: 800,
          }}
        >
          {badge.text}
        </span>
      </div>

      <PageHeading
        eyebrow={`Học từ vựng • Nhóm ${batch.batchNumber} (Từ ${batch.batchStartPos}–${batch.batchEndPos} / ${learning.totalVocabularies})`}
        title={`Chủ đề: ${learning.topicName}`}
        description="Học phát âm MP3, phiên âm IPA và nghĩa tiếng Việt của 5 từ vựng trong nhóm hiện tại, sau đó bấm Chơi ngay 5 từ này để bước vào màn ghép chữ!"
      />

      {/* Bộ chọn nhóm 5 từ nếu đã mở khóa nhiều nhóm */}
      {totalBatches > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }} role="group" aria-label="Chọn nhóm 5 từ đã mở khóa">
          {Array.from({ length: totalBatches }, (_, idx) => {
            const start = idx * WORDS_PER_CHECKPOINT + 1;
            const end = Math.min((idx + 1) * WORDS_PER_CHECKPOINT, learning.vocabularies.length);
            const isSelected = batch.batchNumber === idx + 1;
            return (
              <button
                key={idx}
                type="button"
                className={isSelected ? 'btn-3d btn-sm' : 'btn-outline btn-sm'}
                onClick={() => {
                  setSelectedBatchIdx(idx);
                  setCardIndex(0);
                }}
              >
                Nhóm {idx + 1} (Từ {start}–{end})
              </button>
            );
          })}
        </div>
      )}

      {/* Thanh tiến trình 5 từ trong nhóm */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, batch.batchWords.length)}, minmax(0, 1fr))`,
          gap: '0.6rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
        }}
        role="tablist"
        aria-label="Danh sách 5 từ vựng trong nhóm"
      >
        {batch.batchWords.map((item, idx) => {
          const globalPos = batch.batchIndexInVocabs + idx + 1;
          const isLearned = (effectiveFurthestPos ?? 0) >= globalPos;
          const isActive = idx === cardIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isSaving}
              onClick={() => void handleSelectCard(idx)}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '14px',
                border: isActive
                  ? '2px solid var(--color-brand-primary)'
                  : isLearned
                    ? '2px solid #2b9b6c'
                    : '1px solid var(--color-border-subtle)',
                backgroundColor: isActive
                  ? 'var(--color-pastel-lavender)'
                  : isLearned
                    ? 'var(--color-pastel-mint)'
                    : 'var(--color-bg-white)',
                color: 'var(--color-brand-primary)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: isSaving ? 'wait' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                Từ #{globalPos} {isLearned ? '✓' : ''}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {item.word}
              </span>
            </button>
          );
        })}
      </div>

      {saveError && (
        <div
          role="alert"
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.25rem',
            borderRadius: '14px',
            backgroundColor: '#ffdcd4',
            color: '#822c2c',
            fontWeight: 700,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Thẻ Flashcard chính */}
      {currentWord && (
        <section
          aria-label={`Thẻ từ vựng ${currentWord.word}`}
          className="card-pastel bg-pastel-lavender"
          style={{
            padding: 'clamp(1.5rem, 4vw, 2.5rem)',
            borderRadius: '28px',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                backgroundColor: '#ffffff',
                color: 'var(--color-brand-primary)',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              <BookOpen size={14} />
              Từ {cardIndex + 1} / {batch.batchWords.length} trong nhóm {batch.batchNumber}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                backgroundColor: isCurrentWordLearned ? 'var(--color-pastel-mint)' : 'var(--color-pastel-yellow)',
                color: isCurrentWordLearned ? '#1f7a55' : '#8e641d',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              {isCurrentWordLearned ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Đã ghi nhận đã học</span>
                </>
              ) : (
                <>
                  <Hash size={14} />
                  <span>{currentWord.word.length} chữ cái</span>
                </>
              )}
            </span>
          </div>

          {/* Từ tiếng Anh lớn */}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
              fontWeight: 900,
              color: 'var(--color-brand-primary)',
              letterSpacing: '0.04em',
              margin: '0.5rem 0',
              wordBreak: 'break-word',
            }}
          >
            {currentWord.word}
          </h2>

          {/* Phiên âm IPA */}
          {currentWord.ipa && (
            <div style={{ margin: '0.5rem 0 1rem' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-accent)',
                  backgroundColor: '#ffffff',
                  padding: '0.25rem 0.85rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 123, 98, 0.3)',
                }}
              >
                {currentWord.ipa}
              </span>
            </div>
          )}

          {/* Nghĩa tiếng Việt */}
          <div
            style={{
              margin: '1.25rem auto',
              maxWidth: '520px',
              padding: '1rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(50, 44, 130, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nghĩa tiếng Việt
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-brand-primary)', marginTop: '0.25rem' }}>
              {currentWord.meaningVi}
            </div>
          </div>

          {/* Nút nghe phát âm MP3 */}
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={speak}
              disabled={!currentWord.audioUrl?.trim() || isSpeaking}
              aria-label="Nghe phát âm từ tiếng Anh"
              aria-busy={isSpeaking}
              style={{
                borderRadius: '999px',
                backgroundColor: '#ffffff',
                padding: '0.75rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 800,
              }}
            >
              {isSpeaking ? (
                <Loader2 size={18} className="ui-spinner" />
              ) : (
                <Volume2 size={18} style={{ color: 'var(--color-brand-accent)' }} />
              )}
              <span>{currentWord.audioUrl?.trim() ? 'Nghe phát âm MP3' : 'Chưa có âm thanh'}</span>
            </button>
          </div>

          {/* Điều hướng giữa 5 từ và Lưu tiến độ */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(50, 44, 130, 0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-outline"
              disabled={cardIndex === 0 || isSaving}
              onClick={() => void handleSelectCard(cardIndex - 1)}
            >
              <ArrowLeft size={18} />
              <span>Từ trước</span>
            </button>

            {!isLastCardInBatch ? (
              <button
                type="button"
                className="btn-3d"
                disabled={isSaving}
                onClick={() => void handleCompleteCurrentWordAndNext()}
              >
                {isSaving ? <Loader2 size={18} className="ui-spinner" /> : <CheckCircle2 size={18} />}
                <span>{isCurrentWordLearned ? 'Từ tiếp theo' : 'Đã thuộc & Qua từ tiếp'}</span>
                <ArrowRight size={18} />
              </button>
            ) : !isCurrentWordLearned ? (
              <button
                type="button"
                className="btn-3d"
                disabled={isSaving}
                onClick={() => void handleCompleteCurrentWordAndNext()}
              >
                {isSaving ? <Loader2 size={18} className="ui-spinner" /> : <CheckCircle2 size={18} />}
                <span>Hoàn thành từ thứ {batch.batchWords.length}</span>
              </button>
            ) : (
              <span style={{ fontWeight: 800, color: '#1f7a55', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={18} />
                Đã thuộc đủ {batch.batchWords.length} từ trong nhóm!
              </span>
            )}
          </div>
        </section>
      )}

      {/* Khối CTA Chơi ngay 5 từ vừa học */}
      <div
        className="card-pastel bg-pastel-mint"
        style={{
          marginTop: '1.75rem',
          padding: '1.5rem 1.75rem',
          borderRadius: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-brand-primary)' }}>
            <Gamepad2 size={22} />
            <span>
              {learning.completed || learning.mode === 'REVIEW'
                ? 'Chủ đề đã hoàn tất — Sẵn sàng chơi ôn tập!'
                : `Thực hành ghép chữ với ${batch.batchWords.length} từ vừa học`}
            </span>
          </div>
          <p style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: 'var(--color-text-body)' }}>
            {isBatchCompleted
              ? `Bạn đã học hết nhóm ${batch.batchNumber} (${batch.batchWords.map((w) => w.word).join(', ')}). Bấm nút bên phải để vào chơi ngay 5 từ này!`
              : `Bấm qua từng từ hoặc bấm trực tiếp nút bên phải để hoàn tất lưu tiến độ ${batch.batchWords.length} từ và vào chơi thử thách (CHECKPOINT) ngay.`}
          </p>
        </div>

        <button
          type="button"
          className="btn-3d"
          disabled={isSaving || batch.batchWords.length === 0}
          onClick={() => void handlePlayCurrentBatch()}
        >
          {isSaving ? <Loader2 size={18} className="ui-spinner" /> : <Play size={18} className="fill-current" />}
          <span>
            {learning.completed || learning.mode === 'REVIEW'
              ? 'Chơi ôn tập ngay'
              : `Chơi ngay ${batch.batchWords.length} từ này`}
          </span>
          <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
};
