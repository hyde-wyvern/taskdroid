import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { TaskdroidService } from "@culto/taskdroid-core";
import { createApp } from "./index.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("HTTP API", () => {
  it("returns a controlled 404 when the dashboard entry file is unavailable", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskdroid-dashboard-"));
    roots.push(root);
    const service = await TaskdroidService.initialize(root, "Dashboard");

    await request(createApp(service, join(root, "missing-web")))
      .get("/project")
      .expect(404);
  });

  it("creates and moves work while reporting revision conflicts", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskdroid-http-"));
    roots.push(root);
    const service = await TaskdroidService.initialize(root, "HTTP");
    const server = createApp(service).listen(0);
    try {
      const plan = (
        await request(server)
          .post("/api/plans")
          .send({ title: "API" })
          .expect(201)
      ).body;
      const task = (
        await request(server)
          .post("/api/tasks")
          .send({ planId: plan.id, task: { title: "Route", effort: 8 } })
          .expect(201)
      ).body;
      const moved = (
        await request(server)
          .post(`/api/work-items/${task.id}/move`)
          .send({
            kind: "task",
            statusId: "in-progress",
            expectedRevision: task.revision,
          })
          .expect(200)
      ).body;
      expect(moved.statusId).toBe("in-progress");
      const conflict = await request(server)
        .patch(`/api/tasks/${task.id}`)
        .send({ expectedRevision: task.revision, changes: { title: "Stale" } })
        .expect(409);
      expect(conflict.body.error.code).toBe("REVISION_CONFLICT");
    } finally {
      server.close();
    }
  });

  it("emits a refresh event when Taskdroid data changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskdroid-events-"));
    roots.push(root);
    const service = await TaskdroidService.initialize(root, "Events");
    const server = createApp(service).listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/events`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Event stream missing response body");
    try {
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      await reader.read();
      await service.createPlan({ title: "Changed on disk" });
      const event = await Promise.race([
        reader.read().then(({ value }) => new TextDecoder().decode(value)),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timed out waiting for refresh event")),
            1_000,
          ),
        ),
      ]);
      expect(event).toContain("event: refresh");
    } finally {
      await reader.cancel();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("serves client routes without routing missing assets or APIs to the app", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskdroid-web-"));
    roots.push(root);
    const webRoot = join(root, "web");
    await mkdir(join(webRoot, "assets"), { recursive: true });
    await Promise.all([
      writeFile(join(webRoot, "index.html"), "<main>Taskdroid</main>"),
      writeFile(join(webRoot, "assets", "editor.js"), "export default {};"),
    ]);
    const service = await TaskdroidService.initialize(root, "Web");
    const app = createApp(service, webRoot);

    await request(app)
      .get("/assets/editor.js")
      .set("Accept", "*/*")
      .expect(200)
      .expect("content-type", /javascript/);
    await request(app)
      .get("/assets/missing-editor.js")
      .set("Accept", "*/*")
      .expect(404);
    await request(app)
      .get("/project?document=architecture.md")
      .set("Accept", "text/html")
      .expect(200)
      .expect("<main>Taskdroid</main>");
    await request(app)
      .get("/board")
      .set("Accept", "text/html")
      .expect(200)
      .expect("<main>Taskdroid</main>");
    await request(app)
      .get("/project?detail=plan:plan-id")
      .set("Accept", "text/html")
      .expect(200)
      .expect("<main>Taskdroid</main>");
    for (const path of ["/api", "/api/missing"])
      await request(app)
        .get(path)
        .set("Accept", "text/html")
        .expect(404)
        .expect("content-type", /json/);
  });
});
