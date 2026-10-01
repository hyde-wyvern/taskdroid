import { Select, useMantineColorScheme } from "@mantine/core";
import { useState } from "react";
import { api } from "./api";
import { useToast } from "./Toasts";
import type { Status, Workflow } from "./types";

export function Settings({
  workflow,
  onSaved,
  onError,
}: {
  workflow: Workflow;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const toast = useToast();
  const [statuses, setStatuses] = useState(workflow.statuses);
  const [startStatusId, setStartStatusId] = useState(workflow.startStatusId);
  const [removed, setRemoved] = useState<string[]>([]);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  function patch(id: string, changes: Partial<Status>) {
    setStatuses((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
  function move(index: number, offset: number) {
    const target = index + offset;
    if (index < 1 || target < 1 || target >= statuses.length - 1) return;
    const next = [...statuses];
    [next[index], next[target]] = [next[target], next[index]];
    setStatuses(next);
  }
  function add() {
    const id = `status-${crypto.randomUUID().slice(0, 8)}`;
    setStatuses((items) => [
      ...items.slice(0, -1),
      { id, name: "New status", color: "#64748b", completed: false },
      items.at(-1)!,
    ]);
  }
  function remove(id: string) {
    if (id === startStatusId || statuses.find((item) => item.id === id)?.fixed)
      return;
    setStatuses((items) => items.filter((item) => item.id !== id));
    setRemoved((items) => [...items, id]);
  }
  async function save() {
    try {
      const replacements = Object.fromEntries(
        removed.map((id) => [id, "backlog"]),
      );
      await api.updateWorkflow(
        workflow,
        { statuses, startStatusId },
        replacements,
      );
      await onSaved();
      toast("Workflow saved");
    } catch (error) {
      onError(error);
    }
  }

  return (
    <section className="settings">
      <h2>Workflow settings</h2>
      <p>
        Backlog and Closed stay fixed. Removed statuses move existing work to
        Backlog.
      </p>
      <Select
        label="Color scheme"
        aria-label="Color scheme"
        value={colorScheme}
        data={[
          { value: "auto", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        onChange={(value) => {
          if (value === "auto" || value === "light" || value === "dark")
            setColorScheme(value);
        }}
      />
      <label>
        Claimed tasks start in
        <select
          value={startStatusId}
          onChange={(event) => setStartStatusId(event.target.value)}
        >
          {statuses
            .filter((status) => !status.fixed)
            .map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
        </select>
      </label>
      <div className="status-list">
        {statuses.map((status, index) => {
          const isStartStatus = status.id === startStatusId;
          return (
            <div className="status-row" key={status.id}>
              <input
                aria-label={`${status.name} color`}
                type="color"
                value={status.color}
                onChange={(event) =>
                  patch(status.id, { color: event.target.value })
                }
              />
              <input
                aria-label={`${status.name} name`}
                value={status.name}
                disabled={Boolean(status.fixed)}
                onChange={(event) =>
                  patch(status.id, { name: event.target.value })
                }
              />
              <label>
                <input
                  type="checkbox"
                  checked={status.completed}
                  disabled={Boolean(status.fixed)}
                  onChange={(event) =>
                    patch(status.id, { completed: event.target.checked })
                  }
                />{" "}
                Complete
              </label>
              {!status.fixed && (
                <>
                  <button
                    aria-label={`Move ${status.name} up`}
                    disabled={index === 1}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${status.name} down`}
                    disabled={index === statuses.length - 2}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="danger-link"
                    aria-label={
                      isStartStatus
                        ? `Remove ${status.name} (claimed start status)`
                        : `Remove ${status.name}`
                    }
                    title={
                      isStartStatus
                        ? "The claimed start status cannot be removed"
                        : undefined
                    }
                    disabled={isStartStatus}
                    onClick={() => remove(status.id)}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <footer>
        <button onClick={add}>Add status</button>
        <button className="primary" onClick={() => void save()}>
          Save workflow
        </button>
      </footer>
    </section>
  );
}
