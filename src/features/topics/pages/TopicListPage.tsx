import React from 'react';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TopicListPage: React.FC = () => {
  const sampleTopics = [
    { id: 1, name: 'Animals', description: 'Động vật quen thuộc (cat, dog, bird...)', words: 15 },
    { id: 2, name: 'Fruits', description: 'Trái cây ngon miệng (apple, banana, grape...)', words: 12 },
    { id: 3, name: 'School', description: 'Dụng cụ học tập (book, pencil, ruler...)', words: 18 },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header-box">
        <div className="page-title-row">
          <BookOpen className="text-primary" size={28} />
          <h1 className="page-title">Danh sách Chủ đề (TOPIC-01)</h1>
        </div>
        <p className="page-subtitle">Chọn một chủ đề để bắt đầu học từ vựng hoặc tham gia game thử thách</p>
      </div>

      <div className="grid-3-col">
        {sampleTopics.map((topic) => (
          <div key={topic.id} className="card-item">
            <h3 className="card-item-title">{topic.name}</h3>
            <p className="card-item-desc">{topic.description}</p>
            <div className="card-item-footer">
              <span className="badge badge-info">{topic.words} từ</span>
              <Link to={`/game/session-demo-${topic.id}`} className="btn btn-primary btn-sm">
                <span>Chơi ngay</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="alert alert-info mt-6">
        <Sparkles size={18} />
        <span>Tầng router và layout hoạt động trơn tru. Sẵn sàng gọi GET /api/v1/topics ở issue TOPIC-01.</span>
      </div>
    </div>
  );
};
