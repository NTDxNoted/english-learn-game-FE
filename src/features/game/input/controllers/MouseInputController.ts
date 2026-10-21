import type { InputController, InputMode, InputControllerEvents, CursorPosition } from './InputController';

export class MouseInputController implements InputController {
  readonly mode: InputMode = 'mouse';
  private events: InputControllerEvents = {};
  private active = false;
  private pointerDownCandidate: { x: number; y: number; id: number } | null = null;
  private isDragging = false;

  constructor(events?: InputControllerEvents) {
    if (events) this.events = events;
  }

  setEvents(events: InputControllerEvents): void {
    this.events = events;
  }

  isActive(): boolean {
    return this.active;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerCancel);
    this.events.onStatusChange?.('Chế độ chuột & cảm ứng đang hoạt động');
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerCancel);
    this.pointerDownCandidate = null;
    this.isDragging = false;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointerDownCandidate = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  private handlePointerMove = (event: PointerEvent) => {
    const cursor: CursorPosition = { x: event.clientX, y: event.clientY };
    this.events.onCursorMove?.(cursor);

    if (this.pointerDownCandidate && event.pointerId === this.pointerDownCandidate.id) {
      const distance = Math.hypot(
        event.clientX - this.pointerDownCandidate.x,
        event.clientY - this.pointerDownCandidate.y,
      );
      if (!this.isDragging && distance > 6) {
        this.isDragging = true;
        this.events.onTileGrab?.(cursor);
      }
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.pointerDownCandidate && event.pointerId === this.pointerDownCandidate.id) {
      const cursor: CursorPosition = { x: event.clientX, y: event.clientY };
      if (this.isDragging) {
        this.events.onTileRelease?.(cursor);
      }
    }
    this.pointerDownCandidate = null;
    this.isDragging = false;
  };

  private handlePointerCancel = () => {
    if (this.isDragging) {
      this.events.onTileRelease?.({ x: -1, y: -1 });
    }
    this.pointerDownCandidate = null;
    this.isDragging = false;
  };
}
