export type AppView = "board" | "list" | "plans" | "settings" | "documentation";

export type RouteDetail =
  | { kind: "plan"; id: string }
  | { kind: "task"; id: string }
  | { kind: "subtask"; taskId: string; id: string };

export type AppRoute = {
  view: AppView;
  documentName?: string;
  detail?: RouteDetail;
};

const viewByPath: Record<string, AppView> = {
  board: "board",
  list: "list",
  project: "plans",
  settings: "settings",
  documentation: "documentation",
};

const pathByView: Record<AppView, string> = {
  board: "/board",
  list: "/list",
  plans: "/project",
  settings: "/settings",
  documentation: "/documentation",
};

const safeDocumentName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/;
const safeRecordId = /^[a-zA-Z0-9_-]+$/;

export function parseRoute(input: string | URL): AppRoute {
  let url: URL;
  try {
    url = input instanceof URL ? input : new URL(input, "http://taskdroid.local");
  } catch {
    return { view: "board" };
  }

  const segment = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const view = segment ? viewByPath[segment] : "board";
  if (!view) return { view: "board" };

  const route: AppRoute = { view };
  const documentName = url.searchParams.get("document");
  if (view === "plans" && documentName && safeDocumentName.test(documentName)) {
    route.documentName = documentName;
  }

  const detail = parseDetail(url.searchParams.get("detail"));
  if (detail) route.detail = detail;
  return route;
}

export function serializeRoute(route: AppRoute): string {
  const pathname = pathByView[route.view] ?? pathByView.board;
  const params = new URLSearchParams();

  if (
    route.view === "plans" &&
    route.documentName &&
    safeDocumentName.test(route.documentName)
  ) {
    params.set("document", route.documentName);
  }

  const detail = serializeDetail(route.detail);
  if (detail) params.set("detail", detail);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function parseDetail(value: string | null): RouteDetail | undefined {
  if (!value) return undefined;
  const [kind, firstId, secondId, ...extra] = value.split(":");
  if (extra.length || !firstId || !safeRecordId.test(firstId)) return undefined;
  if (kind === "plan" || kind === "task") {
    return secondId === undefined ? { kind, id: firstId } : undefined;
  }
  if (
    kind === "subtask" &&
    secondId &&
    safeRecordId.test(secondId)
  ) {
    return { kind, taskId: firstId, id: secondId };
  }
  return undefined;
}

function serializeDetail(detail: RouteDetail | undefined): string | undefined {
  if (!detail) return undefined;
  if (detail.kind === "plan" || detail.kind === "task") {
    return safeRecordId.test(detail.id) ? `${detail.kind}:${detail.id}` : undefined;
  }
  return safeRecordId.test(detail.taskId) && safeRecordId.test(detail.id)
    ? `subtask:${detail.taskId}:${detail.id}`
    : undefined;
}