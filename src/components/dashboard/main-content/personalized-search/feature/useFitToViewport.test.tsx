import '@testing-library/jest-dom/extend-expect';
import { act, render, screen } from '@testing-library/react';

import { MIN_PANEL_HEIGHT, VIEWPORT_GAP, useFitToViewport } from './useFitToViewport';

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
