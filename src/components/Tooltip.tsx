import { useId, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

type TooltipProps = {
  text: string;
  label: string;
};

const BUBBLE_WIDTH = 200;
const VIEWPORT_MARGIN = 8;

/**
 * A small hover/focus info tooltip - an icon button rather than a persistent
 * line of text, so a field's explanation doesn't compete for space with the
 * control itself.
 *
 * Positioned via a measured `position: fixed` rect rather than plain CSS
 * anchoring: a CSS-anchored bubble is clipped by any ancestor with
 * `overflow: hidden` (the inspector panel has exactly that, deliberately, to
 * stop *other* content forcing a horizontal scrollbar - see .inspector-content
 * in styles.css) and centering/left-anchoring alone still overflows a narrow
 * panel. Fixed positioning escapes that clipping and gets clamped to the
 * viewport directly, so the full text is always readable regardless of where
 * the trigger sits in a narrow sidebar.
 */
export function Tooltip({ text, label }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      viewportWidth - BUBBLE_WIDTH - VIEWPORT_MARGIN,
    );
    setPosition({ top: rect.bottom + 6, left });
  }, [open]);

  return (
    <span className="tooltip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="tooltip-trigger"
        aria-describedby={id}
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={13} />
      </button>
      <span
        className={`tooltip-bubble ${open && position ? "open" : ""}`}
        role="tooltip"
        id={id}
        style={position ? { top: position.top, left: position.left, width: BUBBLE_WIDTH } : undefined}
      >
        {text}
      </span>
    </span>
  );
}
