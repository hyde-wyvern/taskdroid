import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { TaskdroidService } from '@taskdroid/core';
import { createApp } from './index.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('HTTP API', () => {
  it('creates and moves work while reporting revision conflicts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'taskdroid-http-')); roots.push(root);
    const service = await TaskdroidService.initialize(root, 'HTTP');
    const server = createApp(service).listen(0);
    try {
      const plan = (await request(server).post('/api/plans').send({ title: 'API' }).expect(201)).body;
      const task = (await request(server).post('/api/tasks').send({ planId: plan.id, task: { title: 'Route', effort: 8 } }).expect(201)).body;
      const moved = (await request(server).post(`/api/work-items/${task.id}/move`).send({ kind: 'task', statusId: 'in-progress', expectedRevision: task.revision }).expect(200)).body;
      expect(moved.statusId).toBe('in-progress');
      const conflict = await request(server).patch(`/api/tasks/${task.id}`).send({ expectedRevision: task.revision, changes: { title: 'Stale' } }).expect(409);
      expect(conflict.body.error.code).toBe('REVISION_CONFLICT');
    } finally { server.close(); }
  });

  it('emits a refresh event when Taskdroid data changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'taskdroid-events-')); roots.push(root);
    const service = await TaskdroidService.initialize(root, 'Events');
    const server = createApp(service).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/events`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Event stream missing response body');
    try {
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      await reader.read();
      await service.createPlan({ title: 'Changed on disk' });
      const event = await Promise.race([
        reader.read().then(({ value }) => new TextDecoder().decode(value)),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for refresh event')), 1_000)),
      ]);
      expect(event).toContain('event: refresh');
    } finally {
      await reader.cancel();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
