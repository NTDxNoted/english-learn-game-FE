import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ArrowRight,
  ArrowLeft,
  Hand,
  Lightbulb,
  BookOpen,
  MessageCircle,
  Brain,
  Flame,
  Users,
  Utensils,
  Dumbbell,
  Heart,
} from 'lucide-react';
import { PageHeading } from '../components/common/PageHeading';
import { ModeCard } from '../components/common/ModeCard';
import { ChoiceCard } from '../components/common/ChoiceCard';
import { TopicCard } from '../components/common/TopicCard';
import { useToast } from '../app/providers/useToast';

const levels = [
  {
    title: 'Dễ',
    subtitle: 'Bắt đầu từ những điều cơ bản',
    icon: Sparkles,
    color: 'yellow' as const,
    progress: '12 bài học',
  },
  {
    title: 'Trung bình',
    subtitle: 'Thử thách bản thân thêm một chút',
    icon: Brain,
    color: 'mint' as const,
    progress: '24 bài học',
  },
  {
    title: 'Khó',
    subtitle: 'Sẵn sàng chinh phục chưa?',
    icon: Flame,
    color: 'peach' as const,
    progress: '36 bài học',
  },
];

const topics = [
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

export const HomePage: React.FC = () => {
  const [screen, setScreen] = useState<'home' | 'modes' | 'levels' | 'topics'>('home');
  const navigate = useNavigate();
  const { success } = useToast();

  const goBack = () => {
    setScreen(
      screen === 'levels' || screen === 'topics'
        ? 'modes'
        : screen === 'modes'
          ? 'home'
          : 'home',
    );
  };

  const handleStartGame = (topicName: string, topicId: number) => {
    success(`Bắt đầu học chủ đề: ${topicName}`, 'Vào phòng học');
    navigate(`/game/session-${topicId}`);
  };

  return (
    <div className="home-container">
      {screen === 'home' && (
        <section className="hero-grid">
          {/* Left Column: Hero Copy */}
          <div className="hero-text-block">
            <div className="hero-badge-pill">
              <Sparkles size={16} />
              <span>Học tiếng Anh bằng đôi tay</span>
            </div>

            <h1 className="hero-heading">
              Nói bằng tay.
              <br />
              <span className="hero-accent-text">Nhớ bằng tim.</span>
            </h1>

            <p className="hero-desc">
              Khám phá tiếng Anh theo cách thật tự nhiên — học từ vựng qua cử chỉ bàn tay (MediaPipe
              AI), chơi vui và tiến bộ mỗi ngày cùng hệ thống bài học chuẩn xác thực AWS Cognito.
            </p>

            <button
              type="button"
              onClick={() => setScreen('modes')}
              className="btn-3d"
            >
              <Play size={18} className="fill-current" />
              <span>Bắt đầu học</span>
              <ArrowRight size={18} />
            </button>

            {/* Social Proof */}
            <div className="avatar-stack-row">
              <div className="avatar-dots">
                <span className="avatar-dot bg-dot-1" />
                <span className="avatar-dot bg-dot-2" />
                <span className="avatar-dot bg-dot-3" />
              </div>
              <span>Được yêu thích bởi 2,000+ người học</span>
            </div>
          </div>

          {/* Right Column: Interactive Illustration Card */}
          <div className="hero-illustration-wrapper">
            <div className="hero-deco-bubble-1" />
            <div className="hero-deco-bubble-2" />

            <div className="hero-main-card">
              <div className="floating-badge badge-left">Hello!</div>
              <div className="floating-badge badge-right">Nice to meet you</div>

              <div className="hero-center-circle">
                <Hand size={140} className="stroke-[1.35]" />
              </div>

              <div className="floating-pill-bottom">
                <Lightbulb size={16} color="#ffe293" />
                <span>Học thật dễ dàng</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen !== 'home' && (
        <section style={{ maxWidth: '1020px', margin: '0 auto', padding: '3rem 0' }}>
          <button
            type="button"
            onClick={goBack}
            className="btn-ghost"
            style={{ marginBottom: '2.5rem', paddingLeft: 0, fontWeight: 700 }}
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          {screen === 'modes' && (
            <>
              <PageHeading
                eyebrow="Bước 01 / Chọn hành trình"
                title="Hôm nay bạn muốn học gì?"
                description="Chọn một phương thức học phù hợp với tốc độ và sở thích của bạn nhé."
              />

              <div className="cards-grid-2" style={{ marginTop: '3rem' }}>
                <ModeCard
                  icon={<BookOpen size={32} />}
                  title="Học theo cấp độ"
                  description="Đi từ dễ đến khó, từng bước một để xây nền tảng từ vựng thật vững chắc."
                  accent="yellow"
                  onClick={() => setScreen('levels')}
                />
                <ModeCard
                  icon={<MessageCircle size={32} />}
                  title="Học theo chủ đề"
                  description="Chọn chủ đề bạn yêu thích và học những từ vựng thật gần gũi trong đời sống."
                  accent="lavender"
                  onClick={() => setScreen('topics')}
                />
              </div>
            </>
          )}

          {screen === 'levels' && (
            <>
              <PageHeading
                eyebrow="Bước 02 / Cấp độ"
                title="Chọn cấp độ của bạn"
                description="Không sao nếu bạn mới bắt đầu. Mọi hành trình chinh phục tiếng Anh đều bắt đầu từ bước đầu tiên."
              />

              <div className="cards-grid-3" style={{ marginTop: '2.5rem' }}>
                {levels.map((item, i) => (
                  <ChoiceCard
                    key={item.title}
                    {...item}
                    index={i}
                    onClick={() => handleStartGame(`Cấp độ ${item.title}`, i + 1)}
                  />
                ))}
              </div>
            </>
          )}

          {screen === 'topics' && (
            <>
              <PageHeading
                eyebrow="Bước 02 / Chủ đề"
                title="Bạn muốn nói về gì?"
                description="Chọn một chủ đề yêu thích và bắt đầu thực hành những cử chỉ đầu tiên ngay trước webcam."
              />

              <div className="cards-grid-4" style={{ marginTop: '2.5rem' }}>
                {topics.map((item, i) => (
                  <TopicCard
                    key={item.title}
                    {...item}
                    index={i}
                    onClick={() => handleStartGame(item.title, item.id)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};
