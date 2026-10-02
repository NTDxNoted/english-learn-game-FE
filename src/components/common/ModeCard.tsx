import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: 'yellow' | 'lavender';
  onClick: () => void;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  icon,
  title,
  description,
  accent,
  onClick,
}) => {
  const accentClass = accent === 'yellow' ? 'bg-pastel-yellow' : 'bg-pastel-lavender';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-mode ${accentClass}`}
    >
      <div className="card-icon-box">{icon}</div>
      <div className="flex items-end justify-between gap-4 w-full">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-desc">{description}</p>
        </div>
        <ChevronRight className="shrink-0 mb-1" size={24} color="#322c82" />
      </div>
    </button>
  );
};
