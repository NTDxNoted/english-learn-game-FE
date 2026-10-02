import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TopicCardProps {
  title: string;
  english: string;
  icon: LucideIcon;
  color: 'lavender' | 'peach' | 'blue' | 'pink';
  lessons: string;
  index?: number;
  onClick: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  title,
  english,
  icon: Icon,
  color,
  lessons,
  onClick,
}) => {
  const colorClass =
    color === 'lavender'
      ? 'bg-pastel-lavender'
      : color === 'peach'
        ? 'bg-pastel-peach-light'
        : color === 'blue'
          ? 'bg-pastel-blue'
          : 'bg-pastel-pink';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-topic ${colorClass}`}
    >
      <div className="card-icon-box" style={{ marginBottom: 0 }}>
        <Icon size={24} />
      </div>

      <h3 className="card-topic-title">{title}</h3>
      <p className="card-topic-english">{english}</p>

      <div className="card-topic-footer">
        <span>{lessons}</span>
        <ChevronRight size={16} />
      </div>
    </button>
  );
};
