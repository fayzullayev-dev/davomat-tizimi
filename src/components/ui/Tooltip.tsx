import { cloneElement, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: React.ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'right';
}

/** Portal orqali chiqadigan tooltip — jadval ichidagi overflow uni kesmaydi */
export function Tooltip({ content, children, side = 'top' }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = (e: React.SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (side === 'right') setPos({ x: r.right + 8, y: r.top + r.height / 2 });
      else setPos({ x: r.left + r.width / 2, y: side === 'top' ? r.top - 8 : r.bottom + 8 });
    }, 250);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };
  const p = children.props as Record<string, (e: React.SyntheticEvent<HTMLElement>) => void>;
  const child = cloneElement(children, {
    onMouseEnter: (e: React.SyntheticEvent<HTMLElement>) => {
      show(e);
      p.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.SyntheticEvent<HTMLElement>) => {
      hide();
      p.onMouseLeave?.(e);
    },
    onFocus: (e: React.SyntheticEvent<HTMLElement>) => {
      show(e);
      p.onFocus?.(e);
    },
    onBlur: (e: React.SyntheticEvent<HTMLElement>) => {
      hide();
      p.onBlur?.(e);
    },
    onClick: (e: React.SyntheticEvent<HTMLElement>) => {
      hide();
      p.onClick?.(e);
    },
  } as Record<string, unknown>);

  return (
    <>
      {child}
      {pos &&
        content &&
        createPortal(
          <div
            role="tooltip"
            className="anim-fade pointer-events-none fixed z-[200] max-w-xs rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-surface shadow-pop"
            style={{
              left: pos.x,
              top: pos.y,
              transform: side === 'top' ? 'translate(-50%, -100%)' : side === 'bottom' ? 'translate(-50%, 0)' : 'translate(0, -50%)',
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
