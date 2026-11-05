import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  InputMode,
  CursorPosition,
  InputControllerEvents,
  TileDropEvent,
} from '../controllers/InputController';
import { GestureInputController } from '../controllers/GestureInputController';
import { MouseInputController } from '../controllers/MouseInputController';

interface UseInputControllerOptions {
  onTileDrop?: (drop: TileDropEvent) => void;
  onTileGrab?: (cursor: CursorPosition) => void;
  onTileRelease?: (cursor: CursorPosition) => void;
  onCursorMove?: (cursor: CursorPosition) => void;
}

const cameraErrorMessage = (error: unknown) => {
  if (error instanceof Error || error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Chưa được cấp quyền camera. Hãy cho phép camera trong trình duyệt rồi thử lại.';
    }
    if (error.name === 'NotFoundError') return 'Không tìm thấy camera. Hãy kết nối camera rồi thử lại.';
    if (error.name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
    return error.message || 'Không thể bật camera. Bạn vẫn có thể chơi bằng chuột hoặc cảm ứng.';
  }
  return 'Không thể bật camera. Bạn vẫn có thể chơi bằng chuột hoặc cảm ứng.';
};

export const useInputController = (options: UseInputControllerOptions = {}) => {
  const [mode, setMode] = useState<InputMode>('gesture');
  const [statusText, setStatusText] = useState('Đang chuẩn bị điều khiển...');
  const [fps, setFps] = useState(0);
  const [isPermissionGateOpen, setIsPermissionGateOpen] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gestureControllerRef = useRef<GestureInputController | null>(null);
  const mouseControllerRef = useRef<MouseInputController | null>(null);
  const optionsRef = useRef(options);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  useEffect(() => { optionsRef.current = options; });

  const activateMouse = useCallback((error: string | null = null) => {
    const generation = ++generationRef.current;
    startingRef.current = false;
    gestureControllerRef.current?.stop();
    if (!mountedRef.current) return;
    mouseControllerRef.current ??= new MouseInputController();
    const isCurrent = () => mountedRef.current && generation === generationRef.current;
    mouseControllerRef.current.setEvents({
      onTileDrop: (drop) => { if (isCurrent()) optionsRef.current.onTileDrop?.(drop); },
      onCursorMove: (cursor) => { if (isCurrent()) optionsRef.current.onCursorMove?.(cursor); },
      onTileGrab: (cursor) => { if (isCurrent()) optionsRef.current.onTileGrab?.(cursor); },
      onTileRelease: (cursor) => { if (isCurrent()) optionsRef.current.onTileRelease?.(cursor); },
      onStatusChange: (status) => { if (isCurrent()) setStatusText(status); },
    });
    void mouseControllerRef.current.start();
    setMode('mouse');
    setFps(0);
    setInputError(error);
    setIsStarting(false);
    setIsPermissionGateOpen(false);
    setStatusText('Chế độ chuột & cảm ứng đang bật');
  }, []);

  const switchMode = useCallback(async (newMode: InputMode) => {
    if (newMode === 'mouse') { activateMouse(); return; }
    if (startingRef.current || !mountedRef.current) return;
    if (!videoRef.current || !canvasRef.current) {
      activateMouse('Khung camera chưa sẵn sàng. Vui lòng thử bật camera lại.');
      return;
    }
    const generation = ++generationRef.current;
    const isCurrent = () => mountedRef.current && generation === generationRef.current;
    startingRef.current = true;
    setIsStarting(true);
    setInputError(null);
    setIsPermissionGateOpen(false);
    setStatusText('Đang bật camera...');
    // Only one controller may deliver tile events while the camera starts.
    mouseControllerRef.current?.stop();
    try {
      gestureControllerRef.current ??= new GestureInputController(videoRef.current, canvasRef.current);
      gestureControllerRef.current.setElements(videoRef.current, canvasRef.current);
      const events: InputControllerEvents = {
        onTileDrop: (drop) => { if (isCurrent()) optionsRef.current.onTileDrop?.(drop); },
        onCursorMove: (cursor) => { if (isCurrent()) optionsRef.current.onCursorMove?.(cursor); },
        onTileGrab: (cursor) => { if (isCurrent()) optionsRef.current.onTileGrab?.(cursor); },
        onTileRelease: (cursor) => { if (isCurrent()) optionsRef.current.onTileRelease?.(cursor); },
        onStatusChange: (status) => { if (isCurrent()) setStatusText(status); },
        onFpsUpdate: (value) => { if (isCurrent()) setFps(value); },
        onError: (message) => { if (isCurrent()) activateMouse(message); },
      };
      gestureControllerRef.current.setEvents(events);
      await gestureControllerRef.current.start();
      if (isCurrent()) setMode('gesture');
    } catch (error: unknown) {
      if (isCurrent()) activateMouse(cameraErrorMessage(error));
    } finally {
      if (isCurrent()) { startingRef.current = false; setIsStarting(false); }
    }
  }, [activateMouse]);

  const startCamera = useCallback(() => switchMode('gesture'), [switchMode]);
  // Controllers are created by user actions after the effect mounts.
  const disposeInput = useCallback(() => {
    mountedRef.current = false;
    generationRef.current++;
    startingRef.current = false;
    gestureControllerRef.current?.stop();
    mouseControllerRef.current?.stop();
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    return disposeInput;
  }, [disposeInput]);

  return {
    mode, statusText, fps, isPermissionGateOpen, isStarting, inputError,
    videoRef, canvasRef, switchMode, startCamera,
    closeGate: () => setIsPermissionGateOpen(false),
  };
};
