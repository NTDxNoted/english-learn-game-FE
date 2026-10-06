import React, { useMemo } from 'react';

interface AnswerSlotsProps {
  length: number;
  slots: (string | null)[];
  targetedIndex?: number | null;
  statusFeedback?: 'success' | 'error' | null;
  onSlotClick?: (index: number) => void;
}

export const AnswerSlots: React.FC<AnswerSlotsProps> = ({
  length,
  slots,
  targetedIndex = null,
  statusFeedback = null,
  onSlotClick,
}) => {
  // Tính toán kích thước ô động dựa trên độ dài từ vựng (chống tràn layout / vỡ dòng)
  const sizing = useMemo(() => {
    if (length <= 4) {
      return { size: '72px', fontSize: '2.4rem', gap: '0.85rem' };
    }
    if (length <= 6) {
      return { size: '64px', fontSize: '2.1rem', gap: '0.75rem' };
    }
    if (length <= 8) {
      return { size: '52px', fontSize: '1.75rem', gap: '0.5rem' };
    }
    if (length <= 10) {
      return { size: '44px', fontSize: '1.45rem', gap: '0.35rem' };
    }
    return { size: '38px', fontSize: '1.25rem', gap: '0.25rem' };
  }, [length]);

  const containerClasses = [
    'slots-container',
    statusFeedback === 'success' ? 'celebrate-success' : '',
    statusFeedback === 'error' ? 'shake-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const containerStyle = {
    '--slot-size': sizing.size,
    '--slot-font-size': sizing.fontSize,
    '--slot-gap': sizing.gap,
  } as React.CSSProperties;

  return (
    <div className="slots-wrapper" role="group" aria-label="Các ô chữ cái cần điền">
      <div className={containerClasses} style={containerStyle}>
        {Array.from({ length }).map((_, index) => {
          const letter = slots[index];
          const isFilled = Boolean(letter);
          const isTargeted = targetedIndex === index;

          const slotClasses = [
            'game-slot',
            isFilled ? 'filled' : '',
            isTargeted ? 'targeted' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={index}
              id={`slot-${index}`}
              type="button"
              data-index={index}
              className={slotClasses}
              onClick={() => onSlotClick?.(index)}
              aria-label={`Ô thứ ${index + 1}: ${letter || 'trống'}. Bấm để xóa chữ`}
              title={isFilled ? 'Bấm vào ô để gỡ chữ cái này ra' : undefined}
            >
              <span>{letter || ''}</span>
              {!isFilled && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    fontSize: '0.65rem',
                    color: 'rgba(50, 44, 130, 0.25)',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
