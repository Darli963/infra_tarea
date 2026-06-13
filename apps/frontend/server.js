'use strict';

/*
 * Frontend "Hello World" instrumentado.
 * - Sirve una página con botones para saludar y para generar carga de CPU.
 * - Hace de proxy hacia el backend para evitar problemas de CORS en el navegador.
 * - Expone métricas Prometheus y emite logs JSON a stdout para Loki/Alloy.
 */

const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3001';
const SERVICE = 'frontend';

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

// Métricas
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'frontend_' });

const httpRequestsTotal = new client.Counter({
  name: 'frontend_http_requests_total',
  help: 'Total de peticiones HTTP al frontend',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: String(res.statusCode),
    });

    log('INFO', 'http_request', {
      method: req.method,
      path: req.originalUrl,
      route,
      status: res.statusCode,
    });
  });

  next();
});

const PAGE = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lab Observabilidad · Hello World</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; }
    h1 { font-size: 1.6rem; }
    button { font-size: 1rem; padding: 10px 16px; margin: 6px 6px 6px 0; cursor: pointer; }
    pre { background: #f4f4f5; padding: 12px; border-radius: 8px; overflow: auto; }
    .hint { color: #666; font-size: .9rem; }
  </style>
</head>
<body>
  <h1>Hello World · Laboratorio de Observabilidad</h1>
  <p class="hint">Cada acción genera métricas y logs que podrás revisar en Prometheus, Loki y Grafana.</p>
  <button onclick="hello()">Saludar (API)</button>
  <button onclick="load()">Generar carga de CPU (30s)</button>
  <pre id="out">Listo.</pre>
  <script>
    async function hello() {
      const response = await fetch('/api/hello?name=clase');
      document.getElementById('out').textContent =
        JSON.stringify(await response.json(), null, 2);
    }

    async function load() {
      const response = await fetch('/api/load?seconds=30');
      document.getElementById('out').textContent =
        JSON.stringify(await response.json(), null, 2) +
        '\\n\\nObserva el panel de CPU en Grafana: debería superar el 50%.';
    }
  </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.type('html').send(PAGE);
});

// Proxy hacia el backend
app.get('/api/hello', async (req, res) => {
  try {
    const name = encodeURIComponent(req.query.name || 'mundo');
    const response = await fetch(`${BACKEND_URL}/api/hello?name=${name}`);
    res.status(response.status).json(await response.json());
  } catch (error) {
    log('ERROR', 'backend_no_disponible', { detail: String(error) });
    res.status(502).json({ error: 'backend no disponible' });
  }
});

app.get('/api/load', async (req, res) => {
  try {
    const seconds = parseInt(req.query.seconds, 10) || 30;
    const response = await fetch(`${BACKEND_URL}/api/load?seconds=${seconds}`);
    log('WARN', 'carga_cpu_solicitada_desde_frontend', { seconds });
    res.status(response.status).json(await response.json());
  } catch (error) {
    log('ERROR', 'backend_no_disponible', { detail: String(error) });
    res.status(502).json({ error: 'backend no disponible' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics();
    res.type(register.contentType);
    res.send(metrics);
  } catch (error) {
    log('ERROR', 'metrics_generation_failed', { detail: String(error) });
    res.status(500).json({ error: 'no se pudieron generar las métricas' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  log('INFO', 'frontend_iniciado', { port: PORT, backend: BACKEND_URL });
});

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const events = [
  () => log('INFO', 'pagina_vista', { page: '/', session: rand(1, 999) }),
  () => log('INFO', 'click_boton', { button: ['saludar', 'cargar'][rand(0, 1)] }),
  () => log('WARN', 'recurso_lento', { asset: 'main.js', load_ms: rand(900, 3000) }),
  () => log('ERROR', 'error_js_cliente', { message: 'TypeError: undefined is not a function' }),
];

setInterval(() => {
  events[rand(0, events.length - 1)]();
}, 5000);
