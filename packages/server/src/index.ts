import express, { type ErrorRequestHandler } from 'express';
import { join } from 'node:path';
import { TaskdroidError, TaskdroidService } from '@taskdroid/core';

export function createApp(service: TaskdroidService, webRoot?: string) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/project', asyncRoute(async (_request, response) => response.json(await service.getProject())));
  app.put('/api/project/documents', asyncRoute(async (request, response) => response.json(await service.updateProjectDocuments(request.body.expectedRevision, request.body.documents))));
  app.get('/api/plans', asyncRoute(async (request, response) => response.json(await service.listPlans(request.query.archived === 'true'))));
  app.post('/api/plans', asyncRoute(async (request, response) => response.status(201).json(await service.createPlan(request.body))));
  app.get('/api/plans/:id', asyncRoute(async (request, response) => response.json(await service.getPlan(param(request.params.id), request.query.archived === 'true'))));
  app.patch('/api/plans/:id', asyncRoute(async (request, response) => response.json(await service.updatePlan(param(request.params.id), request.body.expectedRevision, request.body.changes))));
  app.post('/api/plans/:id/archive', asyncRoute(async (request, response) => response.json(await service.archivePlan(param(request.params.id), request.body.expectedRevision))));
  app.post('/api/plans/:id/restore', asyncRoute(async (request, response) => response.json(await service.restorePlan(param(request.params.id), request.body.expectedRevision))));

  app.get('/api/tasks', asyncRoute(async (request, response) => response.json(await service.listTasks({ planId: textQuery(request.query.planId), statusId: textQuery(request.query.statusId), includeArchived: request.query.archived === 'true' }))));
  app.post('/api/tasks', asyncRoute(async (request, response) => response.status(201).json(await service.createTask(request.body.planId, request.body.task))));
  app.get('/api/tasks/:id', asyncRoute(async (request, response) => response.json(await service.getTask(param(request.params.id), request.query.archived === 'true'))));
  app.patch('/api/tasks/:id', asyncRoute(async (request, response) => response.json(await service.updateTask(param(request.params.id), request.body.expectedRevision, request.body.changes))));
  app.post('/api/tasks/:id/claim', asyncRoute(async (request, response) => response.json(await service.claimTask(param(request.params.id), request.body.expectedRevision))));
  app.post('/api/tasks/:id/plan', asyncRoute(async (request, response) => response.json(await service.planTask(param(request.params.id), request.body.expectedRevision, request.body.plan, request.body.subtasks, request.body.replace))));
  app.post('/api/tasks/:id/subtasks', asyncRoute(async (request, response) => response.status(201).json(await service.createSubtask(param(request.params.id), request.body.expectedRevision, request.body.subtask))));
  app.patch('/api/tasks/:taskId/subtasks/:id', asyncRoute(async (request, response) => response.json(await service.updateSubtask(param(request.params.taskId), param(request.params.id), request.body.expectedRevision, request.body.changes))));
  app.post('/api/work-items/:id/move', asyncRoute(async (request, response) => response.json(await service.moveWorkItem(request.body.kind, param(request.params.id), request.body.statusId, request.body.expectedRevision, request.body.taskId))));
  app.post('/api/work-items/:id/archive', asyncRoute(async (request, response) => response.json(await service.archiveWorkItem(request.body.kind, param(request.params.id), request.body.expectedRevision, request.body.taskId))));
  app.post('/api/work-items/:id/restore', asyncRoute(async (request, response) => response.json(await service.restoreWorkItem(request.body.kind, param(request.params.id), request.body.expectedRevision, request.body.taskId))));

  app.get('/api/workflow', asyncRoute(async (_request, response) => response.json(await service.getWorkflow())));
  app.put('/api/workflow', asyncRoute(async (request, response) => response.json(await service.updateWorkflow(request.body.expectedRevision, request.body.workflow, request.body.replacements))));
  app.get('/api/validate', asyncRoute(async (_request, response) => response.json(await service.validate())));

  if (webRoot) {
    app.use(express.static(webRoot));
    app.get('*path', (_request, response) => response.sendFile(join(webRoot, 'index.html')));
  }

  const errors: ErrorRequestHandler = (error, _request, response, next) => {
    void next;
    if (error instanceof TaskdroidError) {
      const status = error.code === 'REVISION_CONFLICT' ? 409 : error.code.includes('NOT_FOUND') ? 404 : 400;
      response.status(status).json({ error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    console.error(error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
  };
  app.use(errors);
  return app;
}

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function textQuery(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function param(value: string | string[]): string { return Array.isArray(value) ? value[0] : value; }
