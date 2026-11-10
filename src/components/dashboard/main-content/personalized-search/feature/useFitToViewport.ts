import { useLayoutEffect, useRef } from 'react';

/** Space kept above and below the panel, in px; also the sticky top. */
export const VIEWPORT_GAP = 16;
/** The panel never gets shorter than this, so the composer stays usable in a short window. */
export const MIN_PANEL_HEIGHT = 240;

export interface FitInput {
  viewportHeight: number;
  /** The panel's top in the viewport now (it moves while the page scrolls, then sticks). */
  panelTop: number;
  /** Where the panel starts with the page at the top, in the viewport. */
  restingTop: number;
  /** The height of the content beside the panel (the results); Infinity when there's none to bound it. */
  contentHeight: number;
}

/**
 * The panel's height: the viewport space below its top edge, so the composer stays in view whether the
 * page is at the top or scrolled. It never exceeds the taller of the content beside it and the space
 * it has with the page at the top. Both are independent of the scroll position, so the panel can't
 * make the page taller as the learner scrolls (which left blank space under the footer when the
 * results were shorter than the window).
 */
export const fitHeight = ({
  viewportHeight, panelTop, restingTop, contentHeight,
}: FitInput): number => {
  const visible = viewportHeight - Math.max(panelTop, VIEWPORT_GAP) - VIEWPORT_GAP;
  const atRest = viewportHeight - Math.max(restingTop, VIEWPORT_GAP) - VIEWPORT_GAP;
  return Math.max(Math.min(visible, Math.max(contentHeight, atRest)), MIN_PANEL_HEIGHT);
};

/**
 * Keeps a sticky panel's height fitted to the viewport (see ``fitHeight``). ``contentRef`` is the
 * element beside it; the panel is re-fitted when it changes size.
 */
export const useFitToViewport = <T extends HTMLElement>(
  enabled: boolean,
  contentRef?: { current: HTMLElement | null },
) => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) { return undefined; }
    // The row the panel sits in doesn't stick, so its top tells where the panel starts at rest.
    const row = element.parentElement?.parentElement ?? null;
    let frame = 0;
    const fit = () => {
      frame = 0;
      const rowTop = row ? row.getBoundingClientRect().top + window.scrollY : element.getBoundingClientRect().top;
      element.style.height = `${fitHeight({
        viewportHeight: window.innerHeight,
        panelTop: element.getBoundingClientRect().top,
        restingTop: rowTop,
        contentHeight: contentRef?.current ? contentRef.current.offsetHeight : Number.POSITIVE_INFINITY,
      })}px`;
    };
    const schedule = () => {
      if (!frame) { frame = window.requestAnimationFrame(fit); }
    };
    fit();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' || !contentRef?.current
      ? null : new ResizeObserver(schedule);
    if (observer && contentRef?.current) { observer.observe(contentRef.current); }
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      element.style.height = '';
    };
  }, [enabled, contentRef]);
  return ref;
};
