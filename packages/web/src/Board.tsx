import { useState } from 'react';
import { api } from './api';
import { EffortSelect } from './EffortSelect';
import { IssueKey } from './IssueKey';
import { useToast } from './Toasts';
import { isClosed } from './isClosed';
import { sortNewest } from './sortNewest';
import type { Task, Workflow } from './types';

export function Board({ planId, workflow, tasks, onSelect, onChanged, onError }: { planId?: string; workflow: Workflow; tasks: Task[]; onSelect: (task: Task) => void; onChanged: () => Promise<void>; onError: (error: unknown) => void }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState(1);
  const toast = useToast();

  async function drop(taskId: string, statusId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.statusId === statusId) return;
    try { await api.move(task, statusId); await onChanged(); toast('Task status updated'); } catch (error) { onError(error); await onChanged(); }
  }

  async function create() {
    if (!title.trim()) return;
    const firstActiveStatus = workflow.statuses.find((status) => !status.fixed)?.id ?? workflow.startStatusId;
    if (!planId) return;
    try { await api.createTask(planId, { title: title.trim(), effort, statusId: firstActiveStatus }); setTitle(''); setCreating(false); await onChanged(); toast('Task created'); } catch (error) { onError(error); }
  }

  return <>
    <div className="board">
      {workflow.statuses.filter((status) => status.fixed !== 'backlog').map((status) => <section className="column" key={status.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void drop(event.dataTransfer.getData('text/task-id'), status.id)}>
        <h2><i style={{ background: status.color }} />{status.name}<span>{tasks.filter((task) => task.statusId === status.id).length}</span></h2>
        <div className="cards">
          {sortNewest(tasks.filter((task) => task.statusId === status.id)).map((task) => <button draggable className="card" key={task.id} onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)} onClick={() => onSelect(task)}>
            <b className={isClosed(workflow, task.statusId) ? 'closed-title' : undefined}><IssueKey value={task.key} kind="task" />{task.title}</b><p>{task.description || 'No description'}</p><footer><span>{task.effort} pts</span><span>{task.subtasks.filter((item) => !item.archivedAt).length} subtasks</span></footer>
          </button>)}
        </div>
      </section>)}
    </div>
    {planId && (creating ? <div className="quick-create"><input autoFocus placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} /><EffortSelect label="Task effort points" value={effort} onChange={setEffort} /><button className="primary" onClick={() => void create()}>Add</button><button onClick={() => setCreating(false)}>Cancel</button></div> : <button className="floating" onClick={() => setCreating(true)}>+ Task</button>)}
  </>;
}
