# Monitoreo

En este laboratorio exploraremos monitoreo con herramientas disponibles


## Configuración Inicial

### 1. Crear el archivo `.env`

Antes de ejecutar los servicios, **debes crear un archivo `.env`** en la raíz del proyecto con las variables de configuración. Se proporciona un archivo `example.env` como referencia.

**Pasos:**
```bash
# Copiar el archivo de ejemplo (si existe)
cp example.env .env

# O crear uno manualmente con las variables necesarias (ver sección de Variables)
```
**IMPORTANTE**: El archivo `.env` contiene credenciales sensibles y **NO debe ser versionado** en Git. Se encuentra en `.gitignore` para proteger tus credenciales.

### 2. Variables de Configuración

Lo que debe contener el archivo `.env` se encuentra en el archivo example.env

**Recomendaciones de seguridad:**
- Cambiar `GF_SECURITY_ADMIN_PASSWORD` por una contraseña fuerte
- Usar un gestor de secretos en entornos de producción
- No compartir el archivo `.env` en repositorios públicos

## Aplicaciones
```bash
docker compose up -d --build
```

## Servicios y URLs
| Servicio       | URL                         | Notas                                  |
|----------------|-----------------------------|----------------------------------------|
| Frontend       | http://localhost:8080       | Hello World + botones de tráfico/carga |
| Backend (API)  | http://localhost:3001       | `/api/hello`, `/metrics`, `/load`      |
| Grafana        | http://localhost:3000       | admin / contraseña del `.env`          |
| Prometheus     | http://localhost:9090       | datasource ya provisionado             |
| Loki           | http://localhost:3100       | datasource ya provisionado             |
| Alloy (UI)     | http://localhost:12345      | estado del recolector de logs          |
| cAdvisor       | http://localhost:8081       | métricas por contenedor                |
| node-exporter  | http://localhost:9100/metrics | métricas del host                    |

## Configuraciones
- **Datasources** Prometheus y Loki (provisionados automáticamente).
- Logs etiquetados por Alloy con `tier=application` o `tier=infrastructure`.

## Actividad
- El **dashboard** (paneles de CPU + logs de app e infra).
- La **alarma** de CPU > 50%.

## Reset
```bash
docker compose down -v   # borra también dashboards/alarmas creados
```

## Notas técnicas

### Versión de Prometheus
Se utiliza `prom/prometheus:v2.54.1` (rama 2.x LTS) en lugar de 3.x. La rama 3.x es experimental. La rama 2.x es la versión recomendada para producción.

### Promtail vs Alloy
Promtail alcanzó EOL (2026-03-02). El recolector de logs es ahora **Grafana Alloy**, que proporciona mayor flexibilidad y mantenimiento continuo.
