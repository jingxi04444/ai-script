import { useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

// Start with the project-sidebar default instead of restoring an old bottom-right position.
const STORAGE_KEY = 'ai-script:task-center-position:v2';
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 6;

interface Position {
  left: number;
  bottom: number;
}

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  origin: Position;
  moved: boolean;
}

export function useTaskCenterPosition() {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef<Position | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);

  function readPosition(): Position {
    const rect = launcherRef.current!.getBoundingClientRect();
    return { left: rect.left, bottom: window.innerHeight - rect.bottom };
  }

  function applyPosition(position: Position) {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const next = {
      left: Math.max(EDGE_GAP, Math.min(position.left, window.innerWidth - launcher.offsetWidth - EDGE_GAP)),
      bottom: Math.max(EDGE_GAP, Math.min(position.bottom, window.innerHeight - launcher.offsetHeight - EDGE_GAP)),
    };
    positionRef.current = next;
    // Only the coordinates change during dragging; task cards do not need to render again.
    launcher.style.setProperty('--task-center-left', `${next.left}px`);
    launcher.style.setProperty('--task-center-bottom', `${next.bottom}px`);
  }

  function savePosition() {
    try {
      if (positionRef.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current));
    } catch {
      // Moving the launcher still works when browser storage is unavailable.
    }
  }

  useLayoutEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && typeof stored === 'object' && 'left' in stored && 'bottom' in stored
        && typeof stored.left === 'number' && Number.isFinite(stored.left)
        && typeof stored.bottom === 'number' && Number.isFinite(stored.bottom)) {
        applyPosition({ left: stored.left, bottom: stored.bottom });
      }
    } catch {
      // Ignore invalid or unavailable saved preferences and use the CSS default.
    }

    const keepInViewport = () => {
      if (positionRef.current) applyPosition(positionRef.current);
    };
    const observer = new ResizeObserver(keepInViewport);
    if (launcherRef.current) observer.observe(launcherRef.current);
    window.addEventListener('resize', keepInViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', keepInViewport);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: readPosition(),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    suppressClickRef.current = true;
    event.currentTarget.dataset.dragging = 'true';
    applyPosition({ left: drag.origin.left + dx, bottom: drag.origin.bottom - dy });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) savePosition();
  }

  function onClickCapture(event: MouseEvent<HTMLButtonElement>) {
    // Pointer release fires a click too; a completed drag must not open the drawer.
    if (suppressClickRef.current && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    suppressClickRef.current = false;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Home') {
      event.preventDefault();
      positionRef.current = null;
      event.currentTarget.style.removeProperty('--task-center-left');
      event.currentTarget.style.removeProperty('--task-center-bottom');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Reset the current position even when storage is unavailable.
      }
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const position = readPosition();
    const step = event.shiftKey ? 40 : 10;
    if (event.key === 'ArrowLeft') position.left -= step;
    if (event.key === 'ArrowRight') position.left += step;
    if (event.key === 'ArrowUp') position.bottom += step;
    if (event.key === 'ArrowDown') position.bottom -= step;
    applyPosition(position);
    savePosition();
  }

  return {
    ref: launcherRef,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onClickCapture,
    onKeyDown,
  };
}
