import { useEffect, useState } from 'react';
import { PlansView } from './PlansView';
import type { Plan, Project, Workflow } from './types';

export function ProjectView({ project, plans, workflow, onSelect, onCreate, onMove, onSave, onError }: { project: Project; plans: Plan[]; workflow: Workflow; onSelect: (plan: Plan) => void; onCreate: () => void; onMove: (plan: Plan, statusId: string) => Promise<void>; onSave: (documents: Project['documents']) => Promise<void>; onError: (error: unknown) => void }) {
  const [documents, setDocuments] = useState(project.documents);
  const [active, setActive] = useState('description.md');
  const [editing, setEditing] = useState(false);
  const names = Object.keys(documents);
  const current = documents[active] ?? '';
  useEffect(() => {
    if (editing) return;
    setDocuments(project.documents);
    setActive((current) => project.documents[current] === undefined ? Object.keys(project.documents)[0] ?? '' : current);
  }, [editing, project.documents]);
  async function save() { try { await onSave(documents); setEditing(false); } catch (error) { onError(error); } }
  function add() {
    const name = window.prompt('Markdown filename (for example, conventions.md)')?.trim();
    if (!name) return;
    const file = name.endsWith('.md') ? name : `${name}.md`;
    if (documents[file]) return;
    setDocuments({ ...documents, [file]: '' }); setActive(file); setEditing(true);
  }
  function remove() {
    if (!active || !window.confirm(`Delete ${active}?`)) return;
    const next = { ...documents }; delete next[active];
    setDocuments(next); setActive(Object.keys(next).sort()[0] ?? ''); setEditing(true);
  }
  return <section className="project-view">
    <div className="view-heading"><div><h2>{project.name}</h2></div><div>{editing ? <><button onClick={() => { setDocuments(project.documents); setEditing(false); }}>Cancel</button><button className="primary" onClick={() => void save()}>Save documents</button></> : <button onClick={() => setEditing(true)}>Edit document</button>}</div></div>
    <div className="document-tabs" role="tablist">{names.map((name) => <button key={name} role="tab" aria-selected={active === name} className={active === name ? 'active' : ''} onClick={() => setActive(name)}>{name}</button>)}<button className="primary add-tab" onClick={add} aria-label="Add document">+</button></div>
    {active && <div className="project-document">{editing ? <textarea aria-label={`${active} content`} value={current} onChange={(event) => setDocuments({ ...documents, [active]: event.target.value })} /> : <pre>{current || 'Empty document'}</pre>}{editing && <button className="danger-link" onClick={remove}>Delete document</button>}</div>}
    <PlansView plans={plans} workflow={workflow} onSelect={onSelect} onCreate={onCreate} onMove={onMove} />
  </section>;
}
