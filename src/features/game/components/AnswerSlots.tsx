import React from 'react';

interface AnswerSlotsProps {
  length: number;
  slots: (string | null)[];
  targetedIndex?: number | null;
  onSlotClick?: (index: number) => void;
}

export const AnswerSlots: React.FC<AnswerSlotsProps> = ({
  length,
  slots,
  targetedIndex = null,
  onSlotClick,
}) => {
  return (
    <div className="slots-container" role="group" aria-label="Các ô chữ cái cần điền">
      {Array.from({ length }).map((_, index) => {
        const letter = slots[index];
        const isFilled = Boolean(letter);
        const isTargeted = targetedIndex === index;

        const classes = [
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
            className={classes}
            onClick={() => onSlotClick?.(index)}
            aria-label={`Ô thứ ${index + 1}: ${letter || 'trống'}`}
          >
            <span>{letter || ''}</span>
          </button>
        );
      })}
    </div>
  );
};
