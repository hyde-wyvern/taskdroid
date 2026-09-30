import { useState } from 'react';
import { api } from './api';
import { StatusSelect } from './StatusSelect';
import { DialogShell } from './Controls';
import { DetailHeader } from './DetailHeader';
import { WorkItemViewer } from './WorkItemViewer';
import { useToast } from './Toasts';
import { isClosed } from './isClosed';
import type { Subtask, Task, Workflow } from './types';

export function SubtaskEditor({ task, subtask: initial, planKey, workflow, archived, onSelectPlan, onSelectTask, onClose, onTaskChanged, onError }: { task: Task; subtask: Subtask; planKey?: string; workflow: Workflow; archived: boolean; onSelectPlan: () => void; onSelectTask: () => void; onClose: () => void; onTaskChanged: (task: Task) => Promise<void>; onError: (error: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const [subtask, setSubtask] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [plan, setPlan] = useState(initial.plan);
  const [effort, setEffort] = useState(initial.effort);
  const [statusId, setStatusId] = useState(initial.statusId);
  const toast = useToast();
  const completed = workflow.statuses.some((status) => status.id === subtask.statusId && (status.completed || status.fixed === 'closed'));
  const completedEffort = completed ? subtask.effort : 0;
  const percentage = subtask.effort > 0 && completed ? 100 : 0;

  async function update(changes: object, success = 'Subtask updated') {
    try {
      const nextTask = await api.updateSubtask(task, subtask.id, changes);
      const next = nextTask.subtasks.find((item) => item.id === subtask.id);
      if (next) { setSubtask(next); setEffort(next.effort); }
      await onTaskChanged(nextTask);
      toast(success);
    } catch (error) { onError(error); }
  }

  async function save() {
    try {
      const nextTask = await api.updateSubtask(task, subtask.id, { title, description, plan, effort, statusId });
      const next = nextTask.subtasks.find((item) => item.id === subtask.id);
      if (next) { setSubtask(next); setEffort(next.effort); }
      await onTaskChanged(nextTask); toast('Subtask saved'); onSelectTask();
    } catch (error) { onError(error); }
  }
  async function archive() {
    try { await onTaskChanged(await api.archiveSubtask(task, subtask.id)); toast('Subtask archived'); onSelectTask(); }
    catch (error) { onError(error); }
  }

  if (!editing) return <WorkItemViewer
    title={subtask.title}
    closed={isClosed(workflow, subtask.statusId)}
    crumbs={[{ key: planKey, kind: 'plan', onSelect: onSelectPlan }, { key: task.key, kind: 'task', onSelect: onSelectTask }, { key: subtask.key, kind: 'subtask' }]}
    status={<><label htmlFor="viewer-subtask-status">Status</label><StatusSelect id="viewer-subtask-status" statuses={workflow.statuses} value={subtask.statusId} disabled={archived} onChange={(statusId) => void update({ statusId })} label="Subtask status" /></>}
    progress={{ percentage, completedEffort, totalEffort: subtask.effort, label: 'effort points', ariaLabel: 'Subtask progress' }}
    description={{ label: 'Description', value: subtask.description, empty: 'No description' }}
    plan={{ label: 'Detailed plan', value: subtask.plan, empty: 'No detailed plan' }}
    onEdit={archived ? undefined : () => setEditing(true)}
    editLabel="Edit subtask"
    onClose={onClose}
  />;

  return <DialogShell title="Edit subtask" onClose={onClose} wide>
    <DetailHeader title="Edit subtask" crumbs={[{ key: planKey, kind: 'plan', onSelect: onSelectPlan }, { key: task.key, kind: 'task', onSelect: onSelectTask }, { key: subtask.key, kind: 'subtask' }]} onClose={onClose} />
    <>
      <div className="form-grid">
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Status<StatusSelect statuses={workflow.statuses} value={statusId} onChange={setStatusId} label="Subtask status" /></label>
      </div>
      <label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label>Detailed plan (Markdown)<textarea rows={7} value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
      <label>Effort points<input type="number" min="0" max="100" value={effort} onChange={(event) => setEffort(Number(event.target.value))} /></label>
    </>
    <footer>
      <button className="danger" onClick={() => void archive()}>Archive subtask</button>
      <span />
      <button onClick={() => setEditing(false)}>Cancel</button>
      <button className="primary" disabled={!title.trim()} onClick={() => void save()}>Save</button>
    </footer>
  </DialogShell>;
}
