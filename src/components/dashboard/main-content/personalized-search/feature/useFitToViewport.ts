import { useLayoutEffect, useRef } from 'react';

/** Space kept below the panes, in px. */
export const VIEWPORT_GAP = 16;
/** The panes never get shorter than this, so the composer stays usable in a short window. */
export const MIN_PANEL_HEIGHT = 240;

/**
 * The panes' height: the window space below where they start with the page at the top. It doesn't
 * depend on the scroll position, so scrolling can never change the page's height.
 */
export const fitHeight = ({ viewportHeight, restingTop }: { viewportHeight: number; restingTop: number }) => (
  Math.max(viewportHeight - Math.max(restingTop, 0) - VIEWPORT_GAP, MIN_PANEL_HEIGHT)
);

/**
 * Sizes the chat and results panes (wide layout) to the window, like the search page: each pane
 * scrolls inside itself. Re-fitted when the window resizes or the content above the panes changes
 * (the debug panel, a "Past search" banner).
 */
export const useFitToViewport = <T extends HTMLElement>(enabled: boolean) => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) { return undefined; }
    let frame = 0;
    const fit = () => {
      frame = 0;
      const restingTop = element.getBoundingClientRect().top + window.scrollY;
      element.style.height = `${fitHeight({ viewportHeight: window.innerHeight, restingTop })}px`;
    };
    const schedule = () => {
      if (!frame) { frame = window.requestAnimationFrame(fit); }
    };
    fit();
    window.addEventListener('resize', schedule);
    const above = element.parentElement;
    const observer = typeof ResizeObserver === 'undefined' || !above ? null : new ResizeObserver(schedule);
    if (observer && above) { observer.observe(above); }
    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      element.style.height = '';
    };
  }, [enabled]);
  return ref;
};
