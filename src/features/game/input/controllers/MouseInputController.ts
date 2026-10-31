import type { InputController, InputMode, InputControllerEvents, CursorPosition } from './InputController';
import { slotAt } from '../utils/gestureRecognition';

export class MouseInputController implements InputController {
  readonly mode: InputMode = 'mouse';
  private events: InputControllerEvents = {};
  private active = false;

  private pointerCandidate: {
    tile: HTMLElement;
    tileId: string;
    letter: string;
    x: number;
    y: number;
    id: number;
  } | null = null;

  private drag: {
    tile: HTMLElement;
    tileId: string;
    letter: string;
  } | null = null;

  private ghost: HTMLDivElement | null = null;
  private suppressClick = false;

  constructor(events?: InputControllerEvents) {
    if (events) this.events = events;
  }

  setEvents(events: InputControllerEvents): void {
    this.events = events;
  }

  isActive(): boolean {
    return this.active;
  }

  isClickSuppressed(): boolean {
    return this.suppressClick;
  }

  private getOrCreateGhost(): HTMLDivElement {
    if (this.ghost && document.body.contains(this.ghost)) {
      return this.ghost;
    }
    let ghost = document.getElementById('drag-ghost-mouse') as HTMLDivElement | null;
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost-mouse';
      ghost.className = 'drag-ghost';
      ghost.hidden = true;
      ghost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ghost);
    }
    this.ghost = ghost;
    return ghost;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.getOrCreateGhost();
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

    if (this.drag) {
      this.drag.tile.classList.remove('drag-source');
      this.drag = null;
    }
    if (this.ghost) {
      this.ghost.hidden = true;
    }
    this.pointerCandidate = null;
    document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
      slot.classList.remove('targeted');
    });
  }

  private beginDrag(candidate: { tile: HTMLElement; tileId: string; letter: string }, x: number, y: number) {
    const { tile, tileId, letter } = candidate;
    if (!tile || tile.classList.contains('used') || tile.classList.contains('drag-source')) return;

    this.drag = { tile, tileId, letter };
    tile.classList.add('drag-source');
    const ghost = this.getOrCreateGhost();
    ghost.textContent = letter;
    ghost.hidden = false;
    this.moveDrag(x, y);
    this.events.onTileGrab?.({ x, y });
  }

  private moveDrag(x: number, y: number) {
    if (!this.drag) return;
    const ghost = this.getOrCreateGhost();
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;

    document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
      slot.classList.remove('targeted');
    });
    const targetSlot = slotAt(x, y);
    if (targetSlot && !targetSlot.classList.contains('filled')) {
      targetSlot.classList.add('targeted');
    }
    this.events.onCursorMove?.({ x, y });
  }

  private finishDrag(x: number, y: number) {
    if (!this.drag) return;
    const { tile, tileId, letter } = this.drag;
    tile.classList.remove('drag-source');
    if (this.ghost) this.ghost.hidden = true;
    this.drag = null;

    document.querySelectorAll<HTMLElement>('.game-slot').forEach((slot) => {
      slot.classList.remove('targeted');
    });

    const slot = slotAt(x, y);
    if (slot && !slot.classList.contains('filled')) {
      const slotIndex = parseInt(slot.dataset.index || '-1', 10);
      if (slotIndex >= 0) {
        this.events.onTileDrop?.({ tileId, letter, slotIndex });
      }
    }
    this.events.onTileRelease?.({ x, y });
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    const tile = target?.closest<HTMLElement>('.game-tile:not(.used)');
    if (tile) {
      const tileId = tile.dataset.id || '';
      const letter = tile.dataset.letter || tile.textContent?.trim() || '';
      this.pointerCandidate = {
        tile,
        tileId,
        letter,
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    const cursor: CursorPosition = { x: event.clientX, y: event.clientY };
    this.events.onCursorMove?.(cursor);

    if (!this.pointerCandidate || event.pointerId !== this.pointerCandidate.id) return;

    if (!this.drag) {
      const distance = Math.hypot(
        event.clientX - this.pointerCandidate.x,
        event.clientY - this.pointerCandidate.y,
      );
      if (distance > 8) {
        this.beginDrag(this.pointerCandidate, event.clientX, event.clientY);
      }
    }

    if (this.drag) {
      this.moveDrag(event.clientX, event.clientY);
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.pointerCandidate || event.pointerId !== this.pointerCandidate.id) return;

    if (this.drag) {
      this.finishDrag(event.clientX, event.clientY);
      this.suppressClick = true;
      setTimeout(() => {
        this.suppressClick = false;
      }, 50);
    }
    this.pointerCandidate = null;
  };

  private handlePointerCancel = () => {
    if (this.drag) {
      this.finishDrag(-1, -1);
    }
    this.pointerCandidate = null;
  };
}
