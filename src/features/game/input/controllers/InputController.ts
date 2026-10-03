export type InputMode = 'gesture' | 'mouse';

export interface CursorPosition {
  x: number;
  y: number;
  handId?: number;
}

export interface InputControllerEvents {
  onCursorMove?: (cursor: CursorPosition) => void;
  onTileGrab?: (cursor: CursorPosition) => void;
  onTileRelease?: (cursor: CursorPosition) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: string) => void;
  onFpsUpdate?: (fps: number) => void;
}

export interface InputController {
  readonly mode: InputMode;
  start(): Promise<void>;
  stop(): void;
  setEvents(events: InputControllerEvents): void;
  isActive(): boolean;
}
