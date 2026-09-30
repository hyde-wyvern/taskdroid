import { StatusSelect } from './StatusSelect';
import { IssueKey } from './IssueKey';
import { isClosed } from './isClosed';
import { sortByWorkPriority } from './sortNewest';
import type { Plan, Workflow } from './types';
import { ProgressBar } from './Controls';

export function PlansView({ plans, workflow, onSelect, onMove, onCreate }: { plans: Plan[]; workflow: Workflow; onSelect: (plan: Plan) => void; onMove: (plan: Plan, statusId: string) => Promise<void>; onCreate: () => void }) {
  return <section className="plans-view">
    <div className="view-heading"><div><h2>Plans</h2></div><button className="primary" onClick={onCreate}>+ Plan</button></div>
    <div className="plan-grid">{sortByWorkPriority(plans, workflow).map((plan) => <article className={`plan-card${plan.archivedAt ? ' archived' : ''}`} key={plan.id}>
      <div className="plan-card-heading"><button className={isClosed(workflow, plan.statusId) ? 'closed-title' : undefined} onClick={() => onSelect(plan)}><IssueKey value={plan.key} kind="plan" />{plan.title}</button><StatusSelect compact statuses={workflow.statuses} value={plan.statusId} disabled={Boolean(plan.archivedAt)} onChange={(statusId) => void onMove(plan, statusId)} label={`${plan.title} status`} /></div>
      <p>{plan.summary || 'No summary'}</p>
      <div className="plan-card-progress"><div><span>{plan.progress.percentage}%</span><small>{plan.progress.completedEffort}/{plan.progress.totalEffort} points</small></div><ProgressBar className="taskdroid-progress-track" size={8} value={plan.progress.percentage} label={`${plan.title} progress`} /></div>
    </article>)}</div>
    {!plans.length && <div className="empty compact"><h2>No plans yet</h2><button className="primary" onClick={onCreate}>Create first plan</button></div>}
  </section>;
}
