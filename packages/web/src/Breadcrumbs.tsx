import { Fragment } from 'react';
import { IssueKey, type WorkItemKind } from './IssueKey';

export type Crumb = { key?: string; kind: WorkItemKind; onSelect?: () => void };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const visible = items.filter((item): item is Crumb & { key: string } => Boolean(item.key));
  if (!visible.length) return null;
  return <nav className="breadcrumbs" aria-label="Work hierarchy">
    {visible.map((item, index) => <Fragment key={item.key}>
      {index > 0 && <span aria-hidden="true">/</span>}
      {item.onSelect ? <button onClick={item.onSelect} aria-label={`Open ${item.key}`}><IssueKey value={item.key} kind={item.kind} compact /></button> : <span><IssueKey value={item.key} kind={item.kind} compact /></span>}
    </Fragment>)}
  </nav>;
}
