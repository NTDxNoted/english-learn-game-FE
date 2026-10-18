import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Utensils,
  Compass,
  Laptop,
  Users,
  PawPrint,
  Leaf,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Sun,
  BookOpen,
  Sparkles,
  Camera,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeading } from '../../../components/common/PageHeading';
import { TopicCard } from '../../../components/common/TopicCard';
import { TopicActionModal } from '../components/TopicActionModal';
import { useTopics } from '../hooks/useTopics';
import { useToast } from '../../../app/providers/useToast';
import type { TopicItem } from '../types/topic.types';
import { useAuth } from '../../auth/hooks/useAuth';
import { progressApi } from '../../progress/api/progressApi';
import { progressKeys } from '../../progress/hooks/useMyStreak';
import type { GameMode } from '../../game/types/gameSession.types';

const MODE_LABELS: Record<GameMode, string> = {
  FREE_PLAY: 'Chơi tự do',
  CHECKPOINT: 'Thử thách (CHECKPOINT)',
  REVIEW: 'Ôn tập (REVIEW)',
};
const isGameMode = (value: string | undefined): value is GameMode => value !== undefined && ['FREE_PLAY', 'CHECKPOINT', 'REVIEW'].includes(value);

// Bảng màu và Icon chuẩn hóa cho 10 chủ đề của hệ thống
const TOPIC_METADATA: Record<string, { icon: LucideIcon; color: 'lavender' | 'peach' | 'blue' | 'pink' | 'yellow' | 'mint' }> = {
  Food: { icon: Utensils, color: 'peach' },
  Travel: { icon: Compass, color: 'blue' },
  Technology: { icon: Laptop, color: 'lavender' },
  Family: { icon: Users, color: 'pink' },
  Animal: { icon: PawPrint, color: 'yellow' },
  Nature: { icon: Leaf, color: 'mint' },
  Sport: { icon: Dumbbell, color: 'blue' },
  School: { icon: GraduationCap, color: 'yellow' },
  Work: { icon: Briefcase, color: 'lavender' },
  'Daily Life': { icon: Sun, color: 'peach' },
};

export const TopicListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success } = useToast();
  const [mode, setMode] = useState<GameMode>('FREE_PLAY');
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const { data: topics, isLoading, isError, refetch } = useTopics();
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const progress = useQuery({
    queryKey: [...progressKeys.topics, userId],
    queryFn: async ({ signal }) => (await progressApi.getMyProgress(signal)).data,
    enabled: userId !== undefined,
    retry: false,
  });
  const progressByTopic = new Map(progress.data?.topics.map((item) => [item.topicId, item]));

  const selectParam = searchParams.get('select');
  const topicFromQuery =
    selectParam && topics ? topics.find((item) => String(item.id) === selectParam) ?? null : null;
  const activeModalTopic = selectedTopic ?? topicFromQuery;

  const clearSelection = () => {
    setSelectedTopic(null);
    if (selectParam !== null) {
      const next = new URLSearchParams(searchParams);
      next.delete('select');
      setSearchParams(next, { replace: true });
    }
  };

  const handleSelectTopic = (topic: TopicItem) => {
    setSelectedTopic(topic);
  };

  const handleLearnTopic = (topic: TopicItem) => {
    clearSelection();
    success(`Bắt đầu học từ vựng chủ đề: ${topic.name}`, topic.description);
    navigate(`/topics/${topic.id}/learn`);
  };

  const handlePlayTopic = (topic: TopicItem, chosenMode: GameMode, resumeSessionId?: number) => {
    clearSelection();
    if (resumeSessionId) {
      navigate(`/game/${resumeSessionId}?topicId=${topic.id}&mode=${chosenMode}`);
      return;
    }
    success(`Đã chọn chủ đề: ${topic.name}. Sẵn sàng vào game ghép chữ!`, topic.description);
    navigate(`/game/new?topicId=${topic.id}&mode=${chosenMode}`);
  };

  const hasAllCounts = !progress.isError && progress.data !== undefined && topics !== undefined && topics.every((topic) => progressByTopic.has(topic.id));
  const totalWordsCount = hasAllCounts ? topics.reduce((acc, topic) => acc + progressByTopic.get(topic.id)!.totalVocabularies, 0) : undefined;
  const completedWordsCount = hasAllCounts ? topics.reduce((acc, topic) => acc + progressByTopic.get(topic.id)!.furthestPosition, 0) : undefined;

  return (
    <div style={{ padding: '2rem 0 4rem' }}>
      <PageHeading
        eyebrow="Danh sách Chủ đề"
        title="Chọn chủ đề bạn muốn học hôm nay"
        description="Mỗi chủ đề chứa các từ vựng phong phú được thiết kế trực quan. Hãy chọn một chủ đề để bắt đầu luyện phản xạ ghép từ bằng cử chỉ bàn tay qua webcam."
      />

      {/* Thẻ thống kê tổng quan (Signly Aesthetic) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginTop: '2rem',
          marginBottom: '2.5rem',
        }}
      >
        <div
          className="card-pastel bg-pastel-lavender"
          style={{ padding: '1.25rem 1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '14px', color: 'var(--color-brand-primary)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>TỔNG CHỦ ĐỀ</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
              {isError ? 'Chưa tải được' : topics ? `${topics.length} Chủ đề` : 'Đang tải…'}
            </div>
          </div>
        </div>

        <div
          className="card-pastel bg-pastel-yellow"
          style={{ padding: '1.25rem 1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '14px', color: '#b27715' }}>
            <Trophy size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b27715' }}>TIẾN TRÌNH TỪ VỰNG</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
              {hasAllCounts ? `${completedWordsCount} / ${totalWordsCount} từ` : progress.isPending ? 'Đang tải…' : 'Chưa tải được tiến trình'}
            </div>
            {progress.isError && <button type="button" className="btn-outline btn-sm" onClick={() => void progress.refetch()}>Tải lại tiến trình</button>}
          </div>
        </div>

        <div
          className="card-pastel bg-pastel-mint"
          style={{ padding: '1.25rem 1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '14px', color: '#1f7a55' }}>
            <Camera size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f7a55' }}>CÔNG NGHỆ NHẬP LIỆU</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              Webcam AI + Chuột
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', maxWidth: '640px' }}>
        <label htmlFor="topic-game-mode" style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Chế độ chơi</label>
        <select id="topic-game-mode" className="form-input" value={mode} aria-describedby="topic-game-mode-hint" onChange={(event) => setMode(event.target.value as GameMode)}>
          {Object.entries(MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <p id="topic-game-mode-hint" style={{ marginTop: '0.65rem', color: 'var(--color-text-subtle)', fontSize: '0.875rem' }}>
          Thử thách CHECKPOINT dùng để ghi điểm và duy trì streak theo cấu hình; cần học đủ nhóm từ. Ôn tập REVIEW cần được mở khóa. Chủ đề có phiên đang chơi sẽ tiếp tục phiên đó.
        </p>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-subtle)', fontWeight: 700 }}>
          Đang tải danh sách chủ đề...
        </div>
      )}

      {isError && (
        <div role="alert" style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#ffdcd4', borderRadius: '16px', color: '#822c2c', fontWeight: 700 }}>
          <p>Không thể tải danh sách chủ đề.</p>
          <button type="button" className="btn-outline" onClick={() => void refetch()}>Tải lại danh sách chủ đề</button>
        </div>
      )}

      {!isLoading && !isError && topics?.length === 0 && <p role="status">Chưa có chủ đề nào được mở.</p>}

      {/* Lưới các chủ đề học tập */}
      <div className="cards-grid-4" style={{ marginTop: '1.5rem' }}>
        {!isError && topics?.map((topic, i) => {
          const meta = TOPIC_METADATA[topic.name] || { icon: BookOpen, color: 'lavender' as const };
          const counts = !progress.isError ? progressByTopic.get(topic.id) : undefined;
          const resumeLabel = counts?.activeSessionId
            ? `Tiếp tục ${isGameMode(counts.activeSessionMode) ? MODE_LABELS[counts.activeSessionMode] : 'phiên đang chơi'}`
            : mode === 'REVIEW' && counts?.reviewUnlocked === false ? 'Ôn tập chưa mở khóa' : undefined;

          return (
            <TopicCard
              key={topic.id}
              title={topic.description || topic.name}
              english={topic.name}
              icon={meta.icon}
              color={meta.color}
              totalWords={counts?.totalVocabularies}
              completedWords={counts?.furthestPosition}
              lessons={resumeLabel}
              index={i}
              onClick={() => handleSelectTopic(topic)}
            />
          );
        })}
      </div>

      {/* Footer gợi ý nghiệp vụ */}
      <div
        className="card-pastel bg-pastel-yellow"
        style={{
          marginTop: '3.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 1.75rem',
          borderRadius: '24px',
        }}
      >
        <Sparkles size={24} color="#8e641d" />
        <p style={{ fontSize: '0.925rem', color: '#8e641d', fontWeight: 600 }}>
          Mỗi từ vựng trong chủ đề đều có phát âm chuẩn bản xứ và phiên âm IPA. Bạn có thể sử dụng cử chỉ bàn tay chụm ngón để gắp chữ cái hoặc chuyển sang chế độ chuột bất cứ lúc nào.
        </p>
      </div>

      <TopicActionModal
        topic={activeModalTopic}
        progress={activeModalTopic && !progress.isError ? progressByTopic.get(activeModalTopic.id) : undefined}
        selectedMode={mode}
        onSelectMode={setMode}
        onClose={clearSelection}
        onLearn={handleLearnTopic}
        onPlay={handlePlayTopic}
      />
    </div>
  );
};
