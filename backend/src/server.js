import cors from 'cors';
import express from 'express';
import {addBenchmark, getAdminData, resetDb, syncEvents} from './store.js';

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json({limit: '1mb'}));

app.get('/api/health', (_request, response) => {
  response.json({status: 'ok', service: 'nhai-fieldauth-backend'});
});

app.post('/api/sync/events', (request, response) => {
  const events = Array.isArray(request.body?.events) ? request.body.events : [];
  response.json(syncEvents(events));
});

app.get('/api/admin/events', (_request, response) => {
  response.json(getAdminData().events);
});

app.get('/api/admin/workers', (_request, response) => {
  response.json(getAdminData().workers);
});

app.get('/api/admin/devices', (_request, response) => {
  response.json(getAdminData().devices);
});

app.get('/api/admin/benchmarks', (_request, response) => {
  response.json(getAdminData().benchmarks);
});

app.post('/api/benchmarks', (request, response) => {
  response.status(201).json(addBenchmark(request.body));
});

app.get('/api/admin/summary', (_request, response) => {
  const db = getAdminData();
  response.json({
    workers: db.workers.length,
    events: db.events.length,
    devices: db.devices.length,
    failedLiveness: db.events.filter(event => !event.livenessPassed).length,
    benchmarks: db.benchmarks.length,
  });
});

app.post('/api/admin/reset', (_request, response) => {
  resetDb();
  response.json({status: 'reset'});
});

const server = app.listen(port, () => {
  console.log(`NHAI FieldAuth backend listening on http://localhost:${port}`);
});

server.on('error', error => {
  console.error('NHAI FieldAuth backend failed to start:', error);
  process.exitCode = 1;
});
