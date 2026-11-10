import '@testing-library/jest-dom/extend-expect';
import { render } from '@testing-library/react';

import { renderInlineBold } from './inlineBold';

const html = (text: string) => render(<p>{renderInlineBold(text)}</p>).container.innerHTML;

describe('renderInlineBold', () => {
  it('bolds **title** and keeps the rest as text', () => {
    expect(html('Try **Principles of Biochemistry** first.')).toBe('<p>Try <strong>Principles of Biochemistry</strong> first.</p>');
  });

  it('hides an opening marker that has no pair yet (mid-stream)', () => {
    expect(html('Try **Principles of Bio')).toBe('<p>Try Principles of Bio</p>');
  });

  it('never renders model text as HTML', () => {
    expect(html('**<img src=x onerror=alert(1)>** and <b>raw</b>'))
      .toBe('<p><strong>&lt;img src=x onerror=alert(1)&gt;</strong> and &lt;b&gt;raw&lt;/b&gt;</p>');
  });

  it('leaves text without markers alone', () => {
    expect(html('Plain reply.')).toBe('<p>Plain reply.</p>');
    expect(html('Empty ****markers')).toBe('<p>Empty markers</p>');
  });
});
