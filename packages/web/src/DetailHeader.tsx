import { Breadcrumbs, type Crumb } from './Breadcrumbs';

export function DetailHeader({ title, titleClassName, crumbs = [], onClose }: { title: string; titleClassName?: string; crumbs?: Crumb[]; onClose: () => void }) {
  return <header className="detail-header">
    <div className="dialog-heading">
      <Breadcrumbs items={crumbs} />
      <h2 className={titleClassName}>{title}</h2>
    </div>
    <button className="detail-close" aria-label="Close" onClick={onClose}>×</button>
  </header>;
}
