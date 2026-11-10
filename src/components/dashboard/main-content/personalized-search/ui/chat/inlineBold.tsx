import type { ReactNode } from 'react';

/**
 * Model text with `**bold**` rendered as <strong>, everything else as plain text: React elements only,
 * never HTML, so model output can't inject markup. While a reply streams (`partial`), an opening `**`
 * without its closing pair yet is hidden instead of flashing as literal asterisks; in a finished reply an
 * unpaired `**` stays as written (`**kwargs`, `2 ** 3`).
 */
export const renderInlineBold = (text: string, { partial = false }: { partial?: boolean } = {}): ReactNode[] => {
  const pieces = text.split('**');
  if (pieces.length % 2 === 0) {
    // An odd number of markers: the last one has no pair (yet).
    const last = pieces.pop() ?? '';
    pieces[pieces.length - 1] += partial ? last : `**${last}`;
  }
  // Keyed by where each bold run starts in the text, which is stable while the reply streams.
  let offset = 0;
  const out: ReactNode[] = [];
  pieces.forEach((piece, position) => {
    if (piece) {
      out.push(position % 2 === 1 ? <strong key={`b${offset}`}>{piece}</strong> : piece);
    }
    offset += piece.length + 2;
  });
  return out;
};

export default renderInlineBold;
