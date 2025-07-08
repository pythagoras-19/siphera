# Docker Setup for Siphera

This document explains how to run Siphera using Docker for both development and production environments.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### Development Environment

1. **Start development services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3007
   - Backend Health: http://localhost:3007/health

3. **Stop development services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

### Production Environment

1. **Start production services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3007
   - Backend Health: http://localhost:3007/health

3. **Stop production services:**
   ```bash
   docker-compose down
   ```

## Individual Services

### Backend Only

```bash
# Development
cd backend
docker build -f Dockerfile.dev -t siphera-backend-dev .
docker run -p 3007:3007 -v $(pwd):/app siphera-backend-dev

# Production
cd backend
docker build -t siphera-backend .
docker run -p 3007:3007 siphera-backend
```

### Frontend Only

```bash
# Development
docker build -f Dockerfile.dev -t siphera-frontend-dev .
docker run -p 3000:3000 -v $(pwd):/app siphera-frontend-dev

# Production
docker build -t siphera-frontend .
docker run -p 3000:80 siphera-frontend
```

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=production
PORT=3007
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3007
```

## Docker Compose Commands

### Useful Commands

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild and restart services
docker-compose up --build --force-recreate

# Stop and remove containers, networks, and volumes
docker-compose down -v

# Scale services
docker-compose up --scale backend=3
```

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# View development logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

## Health Checks

Both services include health checks:

- **Backend:** Checks `/health` endpoint
- **Frontend:** Checks if nginx is serving content

## Networking

Services communicate through the `siphera-network` bridge network:

- Frontend can reach backend at `http://backend:3007`
- Backend is accessible from host at `http://localhost:3007`
- Frontend is accessible from host at `http://localhost:3000`

## Production Deployment

For production deployment, consider:

1. **Environment Variables:** Set proper production values
2. **SSL/TLS:** Add reverse proxy with SSL termination
3. **Database:** Add persistent database service
4. **Monitoring:** Add monitoring and logging services
5. **Scaling:** Use Docker Swarm or Kubernetes for orchestration

## Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 3000 and 3007 are available
2. **Build failures:** Check Dockerfile syntax and dependencies
3. **Connection issues:** Verify network configuration
4. **Permission issues:** Check file ownership and permissions

### Debug Commands

```bash
# Check container status
docker ps -a

# Inspect container logs
docker logs <container-name>

# Execute commands in running container
docker exec -it <container-name> /bin/sh

# Check network connectivity
docker network ls
docker network inspect siphera_siphera-network
``` 