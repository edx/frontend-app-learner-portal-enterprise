import '@testing-library/jest-dom/extend-expect';
import { act, render, screen } from '@testing-library/react';

import {
  MIN_PANEL_HEIGHT, VIEWPORT_GAP, fitHeight, useFitToViewport,
} from './useFitToViewport';

const Panel = ({ enabled }: { enabled: boolean }) => {
  const ref = useFitToViewport<HTMLDivElement>(enabled);
  return <div ref={ref} data-testid="panel" />;
};

const placeAt = (top: number) => {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
};

describe('useFitToViewport', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1; });
  });

  afterEach(() => jest.restoreAllMocks());

  it('ends the panel at the bottom of the window below the header, then once scrolled to the sticky top', () => {
    placeAt(300);
    render(<Panel enabled />);
    expect(screen.getByTestId('panel')).toHaveStyle(`height: ${900 - 300 - VIEWPORT_GAP}px`);

    placeAt(-50); // scrolled: the sticky column sits at the gap
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(screen.getByTestId('panel')).toHaveStyle(`height: ${900 - 2 * VIEWPORT_GAP}px`);
  });

  it('keeps a minimum height in a short window and follows resizes', () => {
    placeAt(300);
    render(<Panel enabled />);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(screen.getByTestId('panel')).toHaveStyle(`height: ${MIN_PANEL_HEIGHT}px`);
  });

  it('with short results beside it, scrolling cannot make the panel (and the page) taller', () => {
    const content = { current: { offsetHeight: 400 } as HTMLElement };
    const Bounded = () => {
      const ref = useFitToViewport<HTMLDivElement>(true, content);
      return <div ref={ref} data-testid="panel" />;
    };
    placeAt(300);
    render(<Bounded />);
    const atTop = 900 - 300 - VIEWPORT_GAP;
    expect(screen.getByTestId('panel')).toHaveStyle(`height: ${atTop}px`);
    // Scrolled: the panel's own top is at the sticky gap, but its row's resting top hasn't moved.
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: HTMLElement) {
      return { top: this.dataset.testid === 'panel' ? VIEWPORT_GAP : 300 - 200 } as DOMRect;
    });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(screen.getByTestId('panel')).toHaveStyle(`height: ${atTop}px`);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('fitHeight: fills the viewport with long results, stays put with short ones, keeps a minimum', () => {
    const base = { viewportHeight: 900, restingTop: 300 };
    expect(fitHeight({ ...base, panelTop: 300, contentHeight: 3000 })).toBe(900 - 300 - VIEWPORT_GAP);
    expect(fitHeight({ ...base, panelTop: -500, contentHeight: 3000 })).toBe(900 - 2 * VIEWPORT_GAP);
    expect(fitHeight({ ...base, panelTop: VIEWPORT_GAP, contentHeight: 400 }))
      .toBe(fitHeight({ ...base, panelTop: 300, contentHeight: 400 }));
    expect(fitHeight({ ...base, panelTop: VIEWPORT_GAP, contentHeight: 700 })).toBe(700);
    expect(fitHeight({
      viewportHeight: 400, panelTop: 350, restingTop: 350, contentHeight: 0,
    })).toBe(MIN_PANEL_HEIGHT);
  });

  it('leaves the element alone when disabled (one pane at a time) and clears its height when turned off', () => {
    placeAt(300);
    const { rerender } = render(<Panel enabled={false} />);
    expect(screen.getByTestId('panel').style.height).toBe('');
    rerender(<Panel enabled />);
    expect(screen.getByTestId('panel').style.height).not.toBe('');
    rerender(<Panel enabled={false} />);
    expect(screen.getByTestId('panel').style.height).toBe('');
  });
});
