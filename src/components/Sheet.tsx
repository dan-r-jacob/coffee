import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { ConfirmOptions } from '../lib/ctx';

interface SheetProps {
  title: string;
  sub?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  onEnter?: () => void;
  wide?: boolean;
  focusFirst?: boolean;
}

/** Bottom sheet on phones, centred dialog on wider screens. Traps focus and closes on Escape. */
export function Sheet({ title, sub, onClose, children, footer, onEnter, wide, focusFirst = true }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const tid = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const first = focusFirst ? el.querySelector<HTMLElement>('input:not([type=checkbox]),select,textarea') || el.querySelector<HTMLElement>('.sheet-actions button') : null;
    (first || el).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a || document.activeElement === el)) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    el.addEventListener('keydown', onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      el.removeEventListener('keydown', onKey);
      document.body.style.overflow = ov;
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={'sheet' + (wide ? ' sheet-wide' : '')} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1}
        onKeyDown={e => {
          const t = e.target as HTMLInputElement;
          if (onEnter && e.key === 'Enter' && t.tagName === 'INPUT' && t.type !== 'checkbox') { e.preventDefault(); onEnter(); }
        }}>
        <h2 id={tid} className="h3">{title}</h2>
        {sub ? <p className="small muted sheet-sub">{sub}</p> : null}
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmSheet({ d, resolve }: { d: ConfirmOptions; resolve: (v: boolean) => void }) {
  return (
    <Sheet title={d.title} onClose={() => resolve(false)}
      footer={<>
        <button type="button" className="btn" onClick={() => resolve(false)}>{d.cancelLabel || 'Cancel'}</button>
        <button type="button" className={d.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => resolve(true)}>{d.confirmLabel || 'Confirm'}</button>
      </>}>
      {d.body ? <p className="dialog-p">{d.body}</p> : null}
    </Sheet>
  );
}
