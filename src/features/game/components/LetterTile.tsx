import React from 'react';

interface LetterTileProps {
  id: string;
  letter: string;
  isUsed: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragSource?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

export const LetterTile: React.FC<LetterTileProps> = ({
  id,
  letter,
  isUsed,
  isSelected = false,
  isHovered = false,
  isDragSource = false,
  onClick,
  onPointerDown,
}) => {
  const classes = [
    'game-tile',
    isSelected ? 'selected' : '',
    isHovered ? 'hand-hover-0' : '',
    isUsed ? 'used' : '',
    isDragSource ? 'drag-source' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      id={`tile-${id}`}
      data-id={id}
      className={classes}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-label={`Khối chữ cái ${letter}`}
      tabIndex={isUsed ? -1 : 0}
    >
      <span>{letter}</span>
    </button>
  );
};
