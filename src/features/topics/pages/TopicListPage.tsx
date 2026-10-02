import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Utensils, Dumbbell, Heart, Sparkles } from 'lucide-react';
import { PageHeading } from '../../../components/common/PageHeading';
import { TopicCard } from '../../../components/common/TopicCard';
import { useToast } from '../../../app/providers/useToast';

const topicsData = [
  {
    title: 'Gia đình',
    english: 'Family',
    icon: Users,
    color: 'lavender' as const,
    lessons: '8 bài học',
    id: 1,
  },
  {
    title: 'Đồ ăn',
    english: 'Food',
    icon: Utensils,
    color: 'peach' as const,
    lessons: '10 bài học',
    id: 2,
  },
  {
    title: 'Thể thao',
    english: 'Sports',
    icon: Dumbbell,
    color: 'blue' as const,
    lessons: '8 bài học',
    id: 3,
  },
  {
    title: 'Cảm xúc',
    english: 'Feelings',
    icon: Heart,
    color: 'pink' as const,
    lessons: '6 bài học',
    id: 4,
  },
];

export const TopicListPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const handleSelectTopic = (topicName: string, topicId: number) => {
    success(`Đã chọn chủ đề: ${topicName}. Bắt đầu phiên học cử chỉ tay!`, 'TOPIC-01');
    navigate(`/game/session-${topicId}`);
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <PageHeading
        eyebrow="TOPIC-01 / Danh sách Chủ đề"
        title="Bạn muốn nói về gì?"
        description="Chọn một chủ đề bất kỳ để bắt đầu luyện phát âm và ghép từ bằng nhận diện cử chỉ bàn tay qua webcam."
      />

      <div className="cards-grid-4" style={{ marginTop: '2.5rem' }}>
        {topicsData.map((item, i) => (
          <TopicCard
            key={item.title}
            {...item}
            index={i}
            onClick={() => handleSelectTopic(item.title, item.id)}
          />
        ))}
      </div>

      {/* Note about AWS Polly and API integration */}
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
          Sẵn sàng kết nối API Backend <code>GET /api/v1/topics</code> (TOPIC-01) và phát âm chuẩn bản xứ qua AWS Polly (AUDIO-01).
        </p>
      </div>
    </div>
  );
};
