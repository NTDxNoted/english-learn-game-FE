import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTopics } from '../hooks/useTopics';
import { useToast } from '../../../app/providers/useToast';
import type { TopicItem } from '../types/topic.types';

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
  const { success } = useToast();
  const { data: topics, isLoading, isError } = useTopics();

  const handleSelectTopic = (topic: TopicItem) => {
    success(`Đã chọn chủ đề: ${topic.name}. Sẵn sàng vào game ghép chữ!`, topic.description);
    navigate(`/game/new?topicId=${topic.id}`);
  };

  const totalWordsCount = topics?.reduce((acc, t) => acc + (t.totalWords || 0), 0) || 0;
  const completedWordsCount = topics?.reduce((acc, t) => acc + (t.completedWords || 0), 0) || 0;

  return (
    <div style={{ padding: '2rem 0 4rem' }}>
      <PageHeading
        eyebrow="[TOPIC-01] / Danh sách Chủ đề"
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
              {topics?.length || 10} Chủ đề
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
              {completedWordsCount} / {totalWordsCount} từ
            </div>
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

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-subtle)', fontWeight: 700 }}>
          Đang tải danh sách chủ đề...
        </div>
      )}

      {isError && (
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#ffdcd4', borderRadius: '16px', color: '#822c2c', fontWeight: 700 }}>
          Không thể kết nối đến máy chủ. Đang hiển thị danh sách chủ đề mặc định.
        </div>
      )}

      {/* Lưới các chủ đề học tập */}
      <div className="cards-grid-4" style={{ marginTop: '1.5rem' }}>
        {topics?.map((topic, i) => {
          const meta = TOPIC_METADATA[topic.name] || { icon: BookOpen, color: 'lavender' as const };

          return (
            <TopicCard
              key={topic.id}
              title={topic.description || topic.name}
              english={topic.name}
              icon={meta.icon}
              color={meta.color}
              totalWords={topic.totalWords}
              completedWords={topic.completedWords}
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
    </div>
  );
};
