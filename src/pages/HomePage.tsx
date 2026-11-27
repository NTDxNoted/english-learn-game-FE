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
  Volume2,
  Flame,
  Trophy,
} from 'lucide-react';

const LEARNING_STEPS = [
  {
    step: '01',
    title: 'Học theo nhóm 5 từ',
    description:
      'Làm quen từng đợt 5 từ vựng với hình ảnh minh họa, phiên âm chuẩn IPA và giọng đọc bản xứ từ Amazon Polly.',
    icon: Volume2,
    cardClass: 'bg-pastel-lavender',
    badgeColor: 'var(--color-brand-primary)',
  },
  {
    step: '02',
    title: 'Ghép chữ bằng đôi tay',
    description:
      'Mở webcam chụm ngón tay gắp thả các ô chữ cái ở tốc độ 60fps hoặc dùng chuột dự phòng linh hoạt mọi lúc.',
    icon: Hand,
    cardClass: 'bg-pastel-mint',
    badgeColor: 'var(--color-pastel-mint-text)',
  },
  {
    step: '03',
    title: 'Vượt thử thách & giữ Streak',
    description:
      'Hoàn thành chế độ CHECKPOINT để tích điểm bảng xếp hạng tuần, duy trì chuỗi ngày học và mở khóa ôn tập REVIEW.',
    icon: Trophy,
    cardClass: 'bg-pastel-yellow',
    badgeColor: 'var(--color-pastel-yellow-text)',
  },
] as const;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container ui-home-page" style={{ paddingBottom: '4rem' }}>
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
            Khám phá tiếng Anh theo cách thật tự nhiên — học từ vựng theo từng đợt 5 từ, nghe phát âm
            chuẩn và rèn phản xạ ghép chữ bằng cử chỉ bàn tay (MediaPipe AI) cùng Signly.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', minWidth: 0 }}>
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

          {/* Workflow Highlights (Không dùng số liệu giả lập) */}
          <div className="avatar-stack-row" style={{ marginTop: '2rem' }}>
            <Flame size={18} color="var(--color-brand-accent)" />
            <span>Lộ trình 5 từ/đợt · 3 chế độ chơi (FREE_PLAY · CHECKPOINT · REVIEW)</span>
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
              <Lightbulb size={16} color="var(--color-pastel-yellow-border)" />
              <span>Học bằng phản xạ tự nhiên</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section style={{ marginTop: '5rem', marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
          <div
            style={{
              fontSize: '0.825rem',
              fontWeight: 800,
              color: 'var(--color-brand-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.5rem',
            }}
          >
            Trải nghiệm học tập thế hệ mới
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--color-brand-primary)',
            }}
          >
            Tại sao nên học tiếng Anh cùng Signly?
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            className="card-pastel bg-pastel-lavender"
            style={{
              padding: '1.75rem',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-bg-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-brand-primary)',
              }}
            >
              <Camera size={26} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--color-brand-primary)',
              }}
            >
              Nhận diện cử chỉ AI
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Tương tác gắp và thả chữ cái trực quan bằng cử chỉ chụm ngón tay trước webcam thông qua
              MediaPipe Vision.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-mint"
            style={{
              padding: '1.75rem',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-bg-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-pastel-mint-text)',
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--color-brand-primary)',
              }}
            >
              Bảo mật On-Device 100%
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Video webcam được xử lý hoàn toàn cục bộ trên máy bạn qua Web Worker, tuyệt đối không
              gửi frame lên server.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-yellow"
            style={{
              padding: '1.75rem',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-bg-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-pastel-yellow-text)',
              }}
            >
              <BookOpen size={26} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--color-brand-primary)',
              }}
            >
              Chủ đề Mở rộng Linh hoạt
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Kho chủ đề đời sống được cập nhật liên tục từ hệ thống quản trị, đi kèm phiên âm IPA và
              phát âm tiếng Anh chuẩn bản xứ.
            </p>
          </div>

          <div
            className="card-pastel bg-pastel-peach"
            style={{
              padding: '1.75rem',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-bg-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-pastel-peach-text)',
              }}
            >
              <MousePointer size={26} />
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--color-brand-primary)',
              }}
            >
              Chế độ Chuột Dự phòng
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-body)', lineHeight: 1.5 }}>
              Linh hoạt kéo thả bằng chuột hoặc chạm cảm ứng nếu máy tính không có camera hoặc điều
              kiện ánh sáng yếu.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Learning Loop (Thay thế phần hardcode chủ đề & % tiến độ giả) */}
      <section style={{ marginTop: '4rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 800,
                color: 'var(--color-brand-accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}
            >
              Cách thức hoạt động
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--color-brand-primary)',
              }}
            >
              Làm chủ từ vựng qua 3 bước đơn giản
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/topics')}
            className="btn-outline"
            style={{
              fontWeight: 800,
              backgroundColor: 'var(--color-bg-white)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Khám phá các chủ đề</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="cards-grid-3">
          {LEARNING_STEPS.map((item) => {
            const StepIcon = item.icon;
            return (
              <div
                key={item.step}
                className={`card-pastel ${item.cardClass}`}
                style={{
                  padding: '1.75rem',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--color-bg-white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.badgeColor,
                    }}
                  >
                    <StepIcon size={24} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      color: item.badgeColor,
                      opacity: 0.45,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.step}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.22rem',
                    fontWeight: 800,
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--color-text-body)', lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
