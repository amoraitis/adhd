# ADHD Focus Tracker - Docker Setup

This project includes Docker support for both development and production environments.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed

## Environment Variables Setup

Before running the application, copy the example environment file and configure it:

```bash
# For production
cp .env.example .env

# For development (optional, uses .env.dev by default)
cp .env.example .env.dev
```

### Environment Variables:

**`.env` (Production)**
- `CONNECTION_STRING`: PostgreSQL connection string (Format: `Host=hostname;Port=5432;Database=dbname;Username=user;Password=pass`)
- `API_PORT`: API external port (default: 5180)
- `ASPNETCORE_ENVIRONMENT`: ASP.NET environment (default: Production)
- `CORS_ORIGINS`: Comma-separated list of allowed CORS origins (e.g., `http://localhost,http://localhost:80`)
- `WEB_PORT`: Web external port (default: 80)
- `VITE_API_BASE_URL`: API base URL for frontend (default: http://localhost:5180/api)

**`.env.dev` (Development)**
- Same as above, with `CONNECTION_STRING` pointing to your dev database, `WEB_PORT=5173`, and `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`

**Note:** PostgreSQL is not included in the Docker setup. You need to provide your own PostgreSQL instance and configure the `CONNECTION_STRING` accordingly.

## Production Deployment

### Build and run all services:

```bash
docker-compose up -d
```

This will start:
- API backend on port 5180
- Web frontend on port 80

**Note:** Make sure your PostgreSQL database is running and accessible with the connection string configured in `.env`

### Access the application:

- Web: http://localhost
- API: http://localhost:5180/api

### Stop all services:

```bash
docker-compose down
```

### Stop and remove all data:

```bash
docker-compose down -v
```

## Development Environment

### Build and run with hot-reload:

```bash
# Use development environment file
docker-compose --env-file .env.dev -f docker-compose.dev.yml up -d

# Or simply (will use .env.dev by default if configured)
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- API backend with hot-reload on port 5180
- Web frontend with Vite dev server on port 5173

**Note:** Make sure your PostgreSQL database is running and accessible with the connection string configured in `.env.dev`

### Access the development environment:

- Web: http://localhost:5173
- API: http://localhost:5180/api

### View logs:

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f web
```

### Run database migrations:

```bash
docker-compose -f docker-compose.dev.yml exec api dotnet ef database update
```

### Stop development services:

```bash
docker-compose -f docker-compose.dev.yml down
```

## Individual Service Builds

### Build API only:

```bash
cd api
docker build -t adhd-api .
```

### Build Web only:

```bash
cd web-client
docker build -t adhd-web .
```

## Environment Variables

### Root .env files (Docker Compose)
- `.env`: Production environment (PostgreSQL, API, Web ports and credentials)
- `.env.dev`: Development environment
- `.env.example`: Template with all available variables

### API (.env in api folder)
- Managed by Docker Compose environment variables
- Connection string passed from docker-compose.yml

### Web Client (.env in web-client folder)
- `VITE_API_BASE_URL`: API base URL (default: http://localhost:5180/api)
- Built into the Docker image at build time

## Troubleshooting

### Reset everything:

```bash
docker-compose down -v
docker-compose up -d --build
```

### Check container status:

```bash
docker-compose ps
```

### Enter a container:

```bash
docker-compose exec api sh
docker-compose exec web sh
```

### Database connection issues:

Make sure your external PostgreSQL is running and accessible:
```bash
# Test connection from your host
psql -h localhost -p 5432 -U adhd_user -d adhd_tracker

# Check API logs
docker-compose logs api
```

## Production Considerations

1. **Use your own PostgreSQL instance** - Configure `CONNECTION_STRING` in `.env` to point to your database
2. **Change default passwords** in your PostgreSQL instance
3. **Configure CORS origins** in `.env` file (`CORS_ORIGINS`) to match your production domain(s)
4. **Never commit .env files** to git (they're in .gitignore)
5. **Configure reverse proxy** (nginx/traefik) for HTTPS
6. **Set up database backups** for your PostgreSQL instance
7. **Monitor container health** and set up logging
8. **Update `VITE_API_BASE_URL`** to match your production domain
9. **Ensure API container can reach your PostgreSQL** (check network connectivity, firewalls)
