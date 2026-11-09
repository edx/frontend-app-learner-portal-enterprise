import type { PageHeaderProps } from '../core/stream/types';

const PageHeaderBlock = ({ title, dek, label }: PageHeaderProps) => (
  <header className="personalized-search__page-header">
    {label && <p className="small text-uppercase font-weight-bold text-gray-500 mb-1">{label}</p>}
    <h2 className="h3 mb-2">{title}</h2>
    {dek && <p className="lead mb-0">{dek}</p>}
  </header>
);

export default PageHeaderBlock;
