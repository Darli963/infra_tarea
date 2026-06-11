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

### Aplicaciones
| Servicio       | URL                         | Descripción                            |
|----------------|-----------------------------|----------------------------------------|
| Frontend       | http://localhost:8080       | Interfaz Hello World + botones de carga |
| Backend (API)  | http://localhost:3001       | API REST con métricas Prometheus       |

### Observabilidad
| Servicio       | URL                         | Propósito                              |
|----------------|-----------------------------|----------------------------------------|
| Grafana        | http://localhost:3000       | Dashboards + Alarmas (admin/contraseña del `.env`) |
| Prometheus     | http://localhost:9090       | Almacén de métricas (datasource ya provisionado) |
| Loki           | http://localhost:3100       | Almacén de logs (datasource ya provisionado) |
| Alloy (UI)     | http://localhost:12345      | Estado del recolector de logs          |

### Exporters de infraestructura
| Servicio       | URL                         | Métricas                               |
|----------------|-----------------------------|----------------------------------------|
| cAdvisor       | http://localhost:8081       | CPU/memoria por contenedor             |
| node-exporter  | http://localhost:9100/metrics | CPU/memoria del host                  |

## Endpoints disponibles

### Backend
```bash
GET  http://localhost:3001/api/hello        # Retorna {"message": "Hello from Backend!"}
POST http://localhost:3001/api/load         # Simula carga de CPU durante 30s
GET  http://localhost:3001/health           # Health check (para Docker)
GET  http://localhost:3001/metrics          # Métricas en formato Prometheus
```

### Frontend
```bash
GET  http://localhost:8080/                 # Página HTML con botones
GET  http://localhost:8080/health           # Health check (para Docker)
GET  http://localhost:8080/metrics          # Métricas en formato Prometheus
```

## Configuraciones
- **Datasources** Prometheus y Loki (provisionados automáticamente).
- Logs etiquetados por Alloy con `tier=application` o `tier=infrastructure`.
- **Healthchecks** configurados en ambas aplicaciones para monitorear disponibilidad.

## Actividad
- El **dashboard** (paneles de CPU + logs de app e infra).
- La **alarma** de CPU > 50%.

## Reset
```bash
docker compose down -v   # borra también dashboards/alarmas creados
```

## Estructura del proyecto

```
infra_tarea/
├── apps/
│   ├── backend/
│   │   ├── Dockerfile              # Imagen Docker con Node.js
│   │   ├── .dockerignore           # Excluye node_modules, .env, etc.
│   │   ├── server.js               # Servidor Express con métricas
│   │   ├── package.json            # Dependencias (express, prom-client)
│   │   └── package-lock.json       # Versiones exactas (reproducibilidad)
│   └── frontend/
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── server.js               # Página HTML + botones de prueba
│       ├── package.json
│       └── package-lock.json
├── docker-compose.yml              # Orquestación de todos los servicios
├── .env                            # Configuración (NO versionado, crear desde example.env)
├── example.env                     # Referencia de variables
├── .gitignore                      # Archivos ignorados por Git
├── README.md                       # Este archivo
└── guia-laboratorio-observabilidad.md # Guía del laboratorio
```

## Características de seguridad

### Dockerfiles mejorados
- **Usuario no-root:** Las aplicaciones corren como usuario `nodejs` (uid 1001), no como `root`
- **Healthchecks:** Ambos servicios tienen healthchecks que verifican `/health` cada 30s
- **Archivo .dockerignore:** Excluye `node_modules`, `.env`, `.git`, etc. del build
- **npm ci:** Usa `npm ci` (clean install) en lugar de `npm install` para garantizar reproducibilidad
- **package-lock.json:** Fija versiones exactas de dependencias en todos los ambientes

### Protección de credenciales
- El archivo `.env` está en `.gitignore` (nunca sube a GitHub)
- `GF_SECURITY_ADMIN_PASSWORD` no está hardcodeado en el código
- Usa variables de entorno para parametrizar todos los servicios

## Verificación de servicios

### Ver estado de los contenedores
```bash
# Todos los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f
```

### Verificar healthchecks
```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:8080/health

# Ambos deberían responder {"status": "UP"}
```

### Pruebas manuales
```bash
# Llamar al backend
curl http://localhost:3001/api/hello

# Generar carga de CPU (simula test de alarma)
curl -X POST http://localhost:3001/api/load

# Ver métricas de Prometheus
curl http://localhost:3001/metrics
```

## Desarrollo

### Reconstruir solo una imagen
```bash
docker compose up -d --build backend
```

### Limpiar y empezar desde cero
```bash
docker compose down -v  # Borra todo, incluyendo volúmenes
docker compose up -d --build
```

## Notas técnicas

### Versión de Prometheus
Se utiliza `prom/prometheus:v2.54.1` (rama 2.x LTS) en lugar de 3.x. La rama 3.x es experimental. La rama 2.x es la versión recomendada para producción.

### Promtail vs Alloy
Promtail alcanzó EOL (2026-03-02). El recolector de logs es ahora **Grafana Alloy**, que proporciona mayor flexibilidad y mantenimiento continuo.

### package-lock.json
Fija las versiones exactas de las dependencias. Es crítico en Docker para garantizar que todos los desarrolladores y CI/CD usan exactamente la misma versión. Se genera automáticamente con `npm install` y debe versionarse en Git.
