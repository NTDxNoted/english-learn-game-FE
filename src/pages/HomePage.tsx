import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ArrowRight,
  Hand,
  Lightbulb,
  Camera,
  ShieldCheck,
  MousePointer,
  BookOpen,
  Utensils,
  Compass,
  Laptop,
  Users,
  PawPrint,
  Dumbbell,
} from 'lucide-react';
import { TopicCard } from '../components/common/TopicCard';

const FEATURED_TOPICS = [
  {
    id: 1,
    title: 'Đồ ăn & Thức uống',
    english: 'Food',
    icon: Utensils,
    color: 'peach' as const,
    totalWords: 20,
    completedWords: 8,
  },
  {
    id: 2,
    title: 'Du lịch & Khám phá',
    english: 'Travel',
    icon: Compass,
    color: 'blue' as const,
    totalWords: 15,
    completedWords: 5,
  },
  {
    id: 3,
    title: 'Công nghệ thông tin',
    english: 'Technology',
    icon: Laptop,
    color: 'lavender' as const,
    totalWords: 25,
    completedWords: 12,
  },
  {
    id: 4,
    title: 'Gia đình & Người thân',
    english: 'Family',
    icon: Users,
    color: 'pink' as const,
    totalWords: 18,
    completedWords: 10,
  },
  {
    id: 5,
    title: 'Thế giới động vật',
    english: 'Animal',
    icon: PawPrint,
    color: 'yellow' as const,
    totalWords: 22,
    completedWords: 4,
  },
  {
    id: 7,
    title: 'Thể thao & Sức khỏe',
    english: 'Sport',
    icon: Dumbbell,
    color: 'blue' as const,
    totalWords: 14,
    completedWords: 6,
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container" style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
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
            AI), chơi vui và tiến bộ mỗi ngày cùng hệ thống Signly.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/topics')}
              className="btn-3d"
            >
              <Play size={18} className="fill-current" />
              <span>Bắt đầu học ngay</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Social Proof */}
          <div className="avatar-stack-row" style={{ marginTop: '2rem' }}>
            <div className="avatar-dots">
              <span className="avatar-dot bg-dot-1" />
              <span className="avatar-dot bg-dot-2" />
              <span className="avatar-dot bg-dot-3" />
            </div>
            <span>Được yêu thích bởi hơn 2,000+ người học</span>
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
              <span>Học bằng phản xạ tự nhiên</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section style={{ marginTop: '5rem', marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--color-brand-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Trải nghiệm học tập thế hệ mới
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
            Tại sao nên học tiếng Anh cùng Signly?
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            className="card-pastel bg-pastel-lavender"
            style={{ padding: '1.75rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-brand-primary)' }}>
              <Camera size={26} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              Nhận diện cử chỉ AI
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Tương tác gắp và thả chữ cái trực quan bằng cử chỉ chụm ngón tay trước webcam thông qua MediaPipe Vision.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-mint"
            style={{ padding: '1.75rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f7a55' }}>
              <ShieldCheck size={26} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              Bảo mật On-Device 100%
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Video webcam được xử lý hoàn toàn cục bộ trên máy bạn qua Web Worker, tuyệt đối không gửi frame lên server.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-yellow"
            style={{ padding: '1.75rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b27715' }}>
              <BookOpen size={26} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              10 Chủ đề Thực tế
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Học từ vựng theo chủ đề đời sống thiết thực (Đồ ăn, Du lịch, Gia đình, Thể thao...) kèm phát âm bản ngữ.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-peach"
            style={{ padding: '1.75rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b04a32' }}>
              <MousePointer size={26} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              Chế độ Chuột Dự phòng
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Linh hoạt kéo thả bằng chuột hoặc chạm cảm ứng nếu máy tính không có camera hoặc điều kiện ánh sáng yếu.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Topics Section */}
      <section style={{ marginTop: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--color-brand-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Chủ đề học tập
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
              Chọn chủ đề bạn yêu thích
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/topics')}
            className="btn-ghost"
            style={{ fontWeight: 800, color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>Xem tất cả 10 chủ đề</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="cards-grid-3">
          {FEATURED_TOPICS.map((item, i) => (
            <TopicCard
              key={item.id}
              title={item.title}
              english={item.english}
              icon={item.icon}
              color={item.color}
              totalWords={item.totalWords}
              completedWords={item.completedWords}
              index={i}
              onClick={() => navigate(`/game/new?topicId=${item.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
