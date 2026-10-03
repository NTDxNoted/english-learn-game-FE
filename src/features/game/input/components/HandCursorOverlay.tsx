import React from 'react';

interface HandCursorOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isGestureMode: boolean;
}

export const HandCursorOverlay: React.FC<HandCursorOverlayProps> = ({ canvasRef, isGestureMode }) => {
  if (!isGestureMode) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 35,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};
