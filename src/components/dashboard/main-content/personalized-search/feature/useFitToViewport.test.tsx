import '@testing-library/jest-dom/extend-expect';
import { act, render, screen } from '@testing-library/react';

import {
  MIN_PANEL_HEIGHT, VIEWPORT_GAP, fitHeight, useFitToViewport,
} from './useFitToViewport';

const Panes = ({ enabled }: { enabled: boolean }) => {
  const ref = useFitToViewport<HTMLDivElement>(enabled);
  return <div><div ref={ref} data-testid="panes" /></div>;
};

const placeAt = (top: number) => {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
};

describe('useFitToViewport', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1; });
  });

  afterEach(() => jest.restoreAllMocks());

  it('fits the panes to the window below where they start, and follows resizes', () => {
    placeAt(300);
    render(<Panes enabled />);
    expect(screen.getByTestId('panes')).toHaveStyle(`height: ${900 - 300 - VIEWPORT_GAP}px`);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1100 });
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(screen.getByTestId('panes')).toHaveStyle(`height: ${1100 - 300 - VIEWPORT_GAP}px`);
  });

  it('fitHeight: independent of scrolling, with a usable minimum', () => {
    // Scrolled 200px: the panes' top is at 100 in the viewport, 300 in the page; the height is the same.
    expect(fitHeight({ viewportHeight: 900, restingTop: 100 + 200 }))
      .toBe(fitHeight({ viewportHeight: 900, restingTop: 300 }));
    expect(fitHeight({ viewportHeight: 400, restingTop: 350 })).toBe(MIN_PANEL_HEIGHT);
  });

  it('leaves the element alone when disabled (one pane at a time) and clears its height when turned off', () => {
    placeAt(300);
    const { rerender } = render(<Panes enabled={false} />);
    expect(screen.getByTestId('panes').style.height).toBe('');
    rerender(<Panes enabled />);
    expect(screen.getByTestId('panes').style.height).not.toBe('');
    rerender(<Panes enabled={false} />);
    expect(screen.getByTestId('panes').style.height).toBe('');
  });
});
