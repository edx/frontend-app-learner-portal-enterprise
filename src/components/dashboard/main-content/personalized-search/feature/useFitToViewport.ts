import { useLayoutEffect, useRef } from 'react';

/** Space kept above and below the panel, in px; also the sticky top. */
export const VIEWPORT_GAP = 16;
/** The panel never gets shorter than this, so the composer stays usable in a short window. */
export const MIN_PANEL_HEIGHT = 240;

/**
 * Keeps an element's height equal to the viewport space below its top edge, so a sticky chat panel
 * ends at the bottom of the window and its composer never runs out of view, whether the page is at
 * the top (the panel starts below the dashboard header and tabs) or scrolled (the panel sticks).
 */
export const useFitToViewport = <T extends HTMLElement>(enabled: boolean) => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) { return undefined; }
    let frame = 0;
    const fit = () => {
      frame = 0;
      const top = Math.max(element.getBoundingClientRect().top, VIEWPORT_GAP);
      element.style.height = `${Math.max(window.innerHeight - top - VIEWPORT_GAP, MIN_PANEL_HEIGHT)}px`;
    };
    const schedule = () => {
      if (!frame) { frame = window.requestAnimationFrame(fit); }
    };
    fit();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(frame);
      element.style.height = '';
    };
  }, [enabled]);
  return ref;
};
