import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gamepad2, ArrowLeft, Camera, MousePointer } from 'lucide-react';

export const GameSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="page-wrapper">
      <div className="flex items-center justify-between mb-6">
        <Link to="/topics" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Quay lại chủ đề</span>
        </Link>
        <span className="badge badge-primary">Mã phiên: {sessionId}</span>
      </div>

      <div className="game-screen-mock">
        <div className="game-mock-header">
          <Gamepad2 size={32} className="text-indigo-400" />
          <h2>Màn hình Game Chữ cái (GAME-05)</h2>
          <p className="text-muted">
            Khu vực ghép chữ bằng cử chỉ tay qua MediaPipe Hands hoặc Chế độ chuột (GAME-01)
          </p>
        </div>

        <div className="game-input-modes">
          <div className="mode-pill active">
            <Camera size={16} />
            <span>Cử chỉ tay (Hand Tracking)</span>
          </div>
          <div className="mode-pill">
            <MousePointer size={16} />
            <span>Chế độ Chuột (Fallback)</span>
          </div>
        </div>

        <div className="game-viewport-placeholder">
          <div className="text-center p-8">
            <p className="text-lg font-semibold mb-2">A P P _ E</p>
            <p className="text-sm text-muted">Kéo thả ký tự L vào chỗ trống</p>
          </div>
        </div>
      </div>
    </div>
  );
};
