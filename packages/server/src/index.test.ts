import { mkdtemp, rm } from 'node:fs/promises';
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
});
