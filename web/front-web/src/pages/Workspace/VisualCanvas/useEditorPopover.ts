import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/** Popovers dismiss independently without letting Escape close the selected canvas node. */
export function useEditorPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const menu = ref.current.querySelector<HTMLElement>('[role="dialog"], [role="listbox"]');
    if (!menu) return;
    const control = ref.current;
    const position = () => {
      const anchor = control.getBoundingClientRect();
      const bounds = menu.getBoundingClientRect();
      const rightAligned = control.classList.contains('is-language') || control.classList.contains('workflow-advanced-control');
      const left = Math.max(16, Math.min(rightAligned ? anchor.right - bounds.width : anchor.left, window.innerWidth - bounds.width - 16)) - anchor.left;
      const above = anchor.top - bounds.height - 9;
      const below = anchor.bottom + 9;
      const screenTop = above >= 64 ? above : below + bounds.height <= window.innerHeight - 72 ? below : Math.max(64, window.innerHeight - bounds.height - 72);
      const top = screenTop - anchor.top;
      setMenuStyle(current => current?.top === top && current?.left === left ? current : { top, left, right: 'auto', bottom: 'auto' });
    };
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(menu);
    observer.observe(control);
    window.addEventListener('resize', schedule);
    document.addEventListener('wheel', schedule, { passive: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); document.removeEventListener('wheel', schedule); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open]);
  return { open, setOpen, ref, menuStyle };
}
