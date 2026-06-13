const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE = 'backend';

app.use(express.json());

function log(level, msg, fields = {}) {
  process.stdout.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE,
      msg,
      ...fields,
    }) + '\n'
  );
}

// Métricas de Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'backend_' });


const httpRequestDuration = new client.Histogram({
  name: 'backend_http_request_duration_seconds',
  help: 'Duración de peticiones HTTP del backend en segundos',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'backend_http_requests_total',
  help: 'Total de peticiones HTTP al backend',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});


app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);

    log('INFO', 'http_request', {
      method: req.method,
      path: req.originalUrl,
      route,
      status: res.statusCode,
      duration_seconds: Number(duration.toFixed(4)),
    });
  });

  next();
});


app.get('/api/hello', (req, res) => {
  const name = String(req.query.name || 'mundo');
  log('INFO', 'saludo_generado', { name });
  res.json({
    message: `Hello from Backend, ${name}!`,
    service: SERVICE,
  });
});

function simulateCpuLoad(seconds) {
  const end = Date.now() + seconds * 1000;
  let result = 0;

  while (Date.now() < end) {
    for (let i = 0; i < 100000; i++) {
      result += Math.sqrt(i + (result % 10));
    }
  }

  return Number(result.toFixed(2));
}

function handleLoad(req, res) {
  const rawSeconds = parseInt(req.query.seconds, 10);
  const seconds = Number.isFinite(rawSeconds)
    ? Math.min(Math.max(rawSeconds, 1), 60)
    : 30;

  log('WARN', 'carga_cpu_iniciada', { seconds });
  const result = simulateCpuLoad(seconds);
  log('WARN', 'carga_cpu_finalizada', { seconds });

  res.json({
    message: 'Load test completed',
    seconds,
    result,
  });
}

app.get('/api/load', handleLoad);
app.post('/api/load', handleLoad);

app.post('/alerts', (req, res) => {
  log('WARN', 'alerta_recibida', {
    body: req.body,
  });
  res.json({ status: 'received' });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    log('ERROR', 'metrics_generation_failed', { detail: String(error) });
    res.status(500).json({ error: 'no se pudieron generar las métricas' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});


app.listen(PORT, '0.0.0.0', () => {
  log('INFO', 'backend_iniciado', { port: PORT });
});
