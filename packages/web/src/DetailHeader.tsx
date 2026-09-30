import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { IconX } from '@tabler/icons-react';
import { IconAction } from './Controls';

export function DetailHeader({ title, titleClassName, crumbs = [], onClose }: { title: string; titleClassName?: string; crumbs?: Crumb[]; onClose: () => void }) {
  return <header className="detail-header">
    <div className="dialog-heading">
      <Breadcrumbs items={crumbs} />
      <h2 aria-hidden="true" className={titleClassName}>{title}</h2>
    </div>
    <IconAction label="Close" icon={<IconX size={18} />} onClick={onClose} />
  </header>;
}
