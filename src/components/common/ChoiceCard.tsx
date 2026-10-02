import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ChoiceCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: 'yellow' | 'mint' | 'peach';
  progress: string;
  index: number;
  onClick: () => void;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  color,
  progress,
  index,
  onClick,
}) => {
  const colorClass =
    color === 'yellow'
      ? 'bg-pastel-yellow'
      : color === 'mint'
        ? 'bg-pastel-mint'
        : 'bg-pastel-peach';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-choice ${colorClass}`}
    >
      <div className="card-choice-header">
        <div className="card-icon-box" style={{ marginBottom: 0 }}>
          <Icon size={24} />
        </div>
        <span className="card-choice-index">0{index + 1}</span>
      </div>

      <h3 className="card-title" style={{ marginTop: '2.5rem' }}>
        {title}
      </h3>
      <p className="card-desc" style={{ minHeight: '3rem' }}>
        {subtitle}
      </p>

      <div className="card-choice-footer">
        <span>{progress}</span>
        <ChevronRight size={16} />
      </div>
    </button>
  );
};
