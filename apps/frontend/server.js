const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Métricas de Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Métrica personalizada: contador de requests
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Middleware para medir duración de requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  next();
});

// Servir página HTML simple
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Frontend - Lab Observabilidad</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>🔍 Frontend - Laboratorio de Observabilidad</h1>
      <p>Backend URL: <code>${BACKEND_URL}</code></p>
      
      <h2>Pruebas:</h2>
      <button onclick="callBackend()">📨 Llamar Backend</button>
      <button onclick="generateLoad()">⚡ Generar Carga</button>
      
      <pre id="output">Resultado aquí...</pre>
      
      <script>
        async function callBackend() {
          try {
            const response = await fetch('${BACKEND_URL}/api/hello');
            const data = await response.json();
            document.getElementById('output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('output').textContent = 'Error: ' + error.message;
          }
        }
        
        async function generateLoad() {
          try {
            const response = await fetch('${BACKEND_URL}/api/load', { method: 'POST' });
            const data = await response.json();
            document.getElementById('output').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('output').textContent = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on port ${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});
