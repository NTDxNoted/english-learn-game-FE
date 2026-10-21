import { useState, useEffect, useRef, useCallback } from 'react';
import type { InputMode, CursorPosition, InputControllerEvents } from '../controllers/InputController';
import { GestureInputController } from '../controllers/GestureInputController';
import { MouseInputController } from '../controllers/MouseInputController';
import { useGameConfig } from '../../hooks/useGameConfig';

interface UseInputControllerOptions {
  onTileGrab?: (cursor: CursorPosition) => void;
  onTileRelease?: (cursor: CursorPosition) => void;
  onCursorMove?: (cursor: CursorPosition) => void;
}

export const useInputController = (options: UseInputControllerOptions = {}) => {
  const { config } = useGameConfig();
  const [mode, setMode] = useState<InputMode>('gesture');
  const [statusText, setStatusText] = useState<string>('Đang chuẩn bị điều khiển...');
  const [fps, setFps] = useState<number>(0);
  const [isPermissionGateOpen, setIsPermissionGateOpen] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gestureControllerRef = useRef<GestureInputController | null>(null);
  const mouseControllerRef = useRef<MouseInputController | null>(null);

  // Lưu callbacks tùy chọn trong ref để tránh re-bind không cần thiết
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const switchToMouse = useCallback(() => {
    gestureControllerRef.current?.stop();
    if (!mouseControllerRef.current) {
      mouseControllerRef.current = new MouseInputController();
    }
    mouseControllerRef.current.setEvents({
      onCursorMove: (c) => optionsRef.current.onCursorMove?.(c),
      onTileGrab: (c) => optionsRef.current.onTileGrab?.(c),
      onTileRelease: (c) => optionsRef.current.onTileRelease?.(c),
      onStatusChange: (status) => setStatusText(status),
    });
    mouseControllerRef.current.start();
    setMode('mouse');
    setStatusText('Chế độ chuột & cảm ứng đang bật');
    setIsPermissionGateOpen(false);
  }, []);

  // Chuyển đổi giữa chế độ Cử chỉ tay và Chuột
  const switchMode = useCallback(
    async (newMode: InputMode) => {
      if (newMode === 'mouse') {
        switchToMouse();
      } else {
        if (!videoRef.current || !canvasRef.current) return;
        setIsStarting(true);
        setIsPermissionGateOpen(false);

        try {
          if (!gestureControllerRef.current) {
            gestureControllerRef.current = new GestureInputController(videoRef.current, canvasRef.current);
          } else {
            gestureControllerRef.current.setElements(videoRef.current, canvasRef.current);
          }

          const events: InputControllerEvents = {
            onCursorMove: (c) => optionsRef.current.onCursorMove?.(c),
            onTileGrab: (c) => optionsRef.current.onTileGrab?.(c),
            onTileRelease: (c) => optionsRef.current.onTileRelease?.(c),
            onStatusChange: (status) => setStatusText(status),
            onFpsUpdate: (currentFps) => setFps(currentFps),
            onError: (err) => {
              setStatusText(err);
              if (config.enableMouseMode) {
                switchToMouse();
              }
            },
          };

          gestureControllerRef.current.setEvents(events);
          await gestureControllerRef.current.start();
          mouseControllerRef.current?.stop();
          setMode('gesture');
        } catch {
          if (config.enableMouseMode) {
            switchToMouse();
          } else {
            setStatusText('Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.');
          }
        } finally {
          setIsStarting(false);
        }
      }
    },
    [config.enableMouseMode, switchToMouse],
  );

  const startCamera = useCallback(() => {
    return switchMode('gesture');
  }, [switchMode]);

  // Dọn dẹp tài nguyên khi unmount hoặc chuyển trang
  useEffect(() => {
    return () => {
      gestureControllerRef.current?.stop();
      mouseControllerRef.current?.stop();
    };
  }, []);

  return {
    mode,
    statusText,
    fps,
    isPermissionGateOpen,
    isStarting,
    videoRef,
    canvasRef,
    switchMode,
    startCamera,
    closeGate: () => setIsPermissionGateOpen(false),
  };
};
