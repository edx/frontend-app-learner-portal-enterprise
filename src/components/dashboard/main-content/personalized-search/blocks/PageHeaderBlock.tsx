import type { PageHeaderProps } from '../core/stream/types';

/** The results headline (h2) and an "About you" line: what the AI knows so far (wireframe D2). */
const PageHeaderBlock = ({ title, dek, label }: PageHeaderProps) => (
  <header className="personalized-search__page-header">
    {label && <p className="sr-only">{label}</p>}
    <h2 className="mb-2">{title}</h2>
    {dek && <p className="text-gray-700 mb-0">{dek}</p>}
  </header>
);

export default PageHeaderBlock;
