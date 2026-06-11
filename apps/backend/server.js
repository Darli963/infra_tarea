const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Rutas
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Backend!' });
});

app.post('/api/load', (req, res) => {
  // Simular carga de CPU
  const iterations = 10000000;
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i);
  }
  res.json({ message: 'Load test completed', result: result.toFixed(2) });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Health check para Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});
