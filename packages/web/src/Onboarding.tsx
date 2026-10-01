import { TaskButton } from "./Controls";

export function Onboarding({ onContinue }: { onContinue: () => void }) {
  return (
    <article
      className="documentation onboarding"
      aria-labelledby="onboarding-title"
    >
      <header className="documentation-header onboarding-header">
        <p className="onboarding-eyebrow">
          A local workspace for people and agents
        </p>
        <h2 id="onboarding-title">Welcome to Taskdroid</h2>
        <p>
          Taskdroid keeps plans and day-to-day work organized in your project,
          so people and AI agents can see what matters and pick up where work
          left off.
        </p>
      </header>
      <div className="onboarding-grid">
        <section>
          <h3>Local-first by design</h3>
          <p>
            Project data lives in <code>.taskdroid/</code> on this machine.
            There is no account, cloud service, database, daemon, or embedded
            LLM. The dashboard and MCP server work with the same local project.
          </p>
        </section>
        <section>
          <h3>One clear hierarchy</h3>
          <dl>
            <div>
              <dt>Project</dt>
              <dd>The workspace and its shared workflow.</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>An outcome that groups related tasks.</dd>
            </div>
            <div>
              <dt>Task</dt>
              <dd>A unit of work that can be sliced when needed.</dd>
            </div>
            <div>
              <dt>Subtask</dt>
              <dd>A focused piece of work; subtasks are the leaves.</dd>
            </div>
          </dl>
        </section>
      </div>
      <section>
        <h3>Work in the dashboard</h3>
        <ol>
          <li>Create a Plan for an outcome and add its Tasks.</li>
          <li>
            Use Board for active work, List for the full hierarchy, and Project
            for plans and project documents.
          </li>
          <li>
            Slice a Task into Subtasks when it needs smaller steps; progress
            follows active leaf effort.
          </li>
          <li>
            Use Settings to configure workflow statuses and the status used when
            claiming a Task.
          </li>
        </ol>
      </section>
      <section>
        <h3>Work with an agent over MCP</h3>
        <ol>
          <li>
            Start <code>taskdroid mcp</code>; the server uses this local project
            over stdio.
          </li>
          <li>
            Read <code>get_project</code>, <code>get_workflow</code>, and
            project guidance with <code>get_document</code>.
          </li>
          <li>
            Inspect a Plan, claim a Task, and use <code>plan_task</code> to
            record a detailed plan and Subtasks.
          </li>
          <li>
            Keep changes local, refresh after revision conflicts, and move
            completed work to the next workflow status.
          </li>
        </ol>
      </section>
      <div className="onboarding-actions">
        <TaskButton variant="primary" type="button" onClick={onContinue}>
          Continue to Taskdroid
        </TaskButton>
      </div>
    </article>
  );
}
