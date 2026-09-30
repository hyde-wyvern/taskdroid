const groups = [
  ['Project', 'get_project, get_workflow'], ['Documents', 'list_documents, get_document, update_document'],
  ['Plans', 'list_plans, get_plan, create_plan, update_plan, archive_plan, restore_plan'],
  ['Tasks', 'list_tasks, get_task, create_task, update_task, claim_task, plan_task'],
  ['Subtasks', 'create_subtask, update_subtask'], ['Work items', 'move_work_item, archive_work_item, restore_work_item'],
];

export function Documentation() {
  return <article className="documentation">
    <header className="documentation-header"><h2>Taskdroid documentation</h2><p>Local planning and work tracking for people and AI agents.</p></header>
    <section><h3>Core concepts</h3><dl>
      <div><dt>Project</dt><dd>One local `.taskdroid/` workspace with workflow, documents, plans, and tasks.</dd></div>
      <div><dt>Plan</dt><dd>High-level outcome. A plan contains tasks and has weighted progress.</dd></div>
      <div><dt>Task</dt><dd>A unit of work under one plan. It may be unsliced or contain subtasks.</dd></div>
      <div><dt>Subtask</dt><dd>A leaf work item under a task. Nesting stops here.</dd></div>
      <div><dt>Workflow</dt><dd>Ordered statuses. Backlog stays first and Closed stays last; middle statuses are configurable.</dd></div>
    </dl></section>
    <section><h3>Dashboard workflow</h3><ol><li>Create a plan from Project view and add high-level tasks.</li><li>Use Board for active work or List for all hierarchy levels.</li><li>Add detailed task plans and subtasks when work needs slicing.</li><li>Use Settings to manage workflow statuses and claim start status.</li></ol><p>Progress uses active leaf effort. Sliced task effort derives from active subtasks.</p></section>
    <section><h3>CLI</h3><pre><code>taskdroid init --name "My project"{`\n`}taskdroid ui{`\n`}taskdroid mcp{`\n`}taskdroid validate</code></pre><p><code>taskdroid ui</code> serves current project at <code>127.0.0.1:4317</code> by default.</p></section>
    <section><h3>MCP workflow</h3><ol><li>Call <code>get_project</code> and <code>get_workflow</code>.</li><li>Call <code>list_documents</code>, then read <code>AGENTS.md</code> with <code>get_document</code>.</li><li>Create or inspect a plan, then claim a task.</li><li>Use <code>plan_task</code> for detailed Markdown and structured subtasks.</li><li>Move work until Closed.</li></ol><p>Mutations require current <code>expectedRevision</code>. Re-fetch after conflicts; never edit `.taskdroid/` JSON directly.</p></section>
    <section><h3>MCP tools</h3><div className="documentation-tools">{groups.map(([group, tools]) => <div key={group}><b>{group}</b><code>{tools}</code></div>)}</div></section>
    <section><h3>Agent instructions and docs</h3><p>Interactive initialization can create a root <code>AGENTS.md</code> pointer. Project Markdown files live in <code>.taskdroid/docs/</code>; edit them from Project view or with <code>update_document</code>.</p><p>Use <code>taskdroid init --manage-agent-instructions</code> for non-interactive setup.</p></section>
  </article>;
}
