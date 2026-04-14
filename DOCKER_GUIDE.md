## 🐳 Docker Deployment Guide

### Quick Start

```bash
# 1. Clone et setup
git clone <repo>
cd swiftpay

# 2. Configuration
cp .env.docker .env
# Edit .env with your configuration

# 3. Build and run
docker-compose up -d

# 4. Initialize database
docker-compose exec backend npm run migrate

# 5. Check status
docker-compose ps
curl http://localhost/health
```

### Architecture

```
┌─────────────────────────────────────────────┐
│         Nginx Reverse Proxy (80/443)         │
└──────────┬──────────────────────────────────┘
           │
     ┌─────┴──────┐
     │            │
┌────▼────┐  ┌───▼──────┐
│ Backend  │  │ Frontend │
│ API:3000 │  │ :8081    │
└────┬────┘  └────┬─────┘
     │            │
     └─────┬──────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
┌───▼─┐    ┌──────▼──┐  ┌───▼──┐  ┌────▼────┐
│ DB  │    │  Redis  │  │Adminer│  │ Volumes │
│5432 │    │  6379   │  │ 8080  │  │(data)   │
└─────┘    └─────────┘  └───────┘  └─────────┘
```

### Services

#### 1. PostgreSQL Database
- **Port:** 5432
- **User:** `swiftpay_user`
- **Database:** `swiftpay`
- **Data:** Persistent volume `postgres_data`
- **Migrations:** Auto-applied on startup
  - `migrations.sql` - Initial schema
  - `migrations_phase2.sql` - Phase 2 features

```bash
# Connect to database
docker-compose exec postgres psql -U swiftpay_user -d swiftpay

# Backup database
docker-compose exec postgres pg_dump -U swiftpay_user -d swiftpay > backup.sql

# Restore database
docker exec -i swiftpay-postgres psql -U swiftpay_user -d swiftpay < backup.sql
```

#### 2. Redis Cache
- **Port:** 6379
- **Password:** Required (from .env)
- **Data:** Persistent volume `redis_data`
- **TTL:** Configured per key

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a your_password

# Check cache stats
250:6379> INFO stats
250:6379> DBSIZE
```

#### 3. Backend API
- **Port:** 3000 (internal) / 80 (via Nginx)
- **Health check:** `GET /health`
- **Logs:** `docker-compose logs -f backend`
- **Environment:** From `.env`

```bash
# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Execute command in container
docker-compose exec backend npm run seed
```

#### 4. Frontend
- **Port:** 8081 (Expo dev server)
- **Metro:** 19000-19001
- **Note:** For production, export as static website

```bash
# Expo tunnel mode (recommended)
docker-compose exec frontend expo start --tunnel

# Or local network
docker-compose exec frontend expo start --localhost
```

#### 5. Nginx Proxy
- **HTTP:** Port 80
- **HTTPS:** Port 443 (configured but not enabled)
- **Features:**
  - Rate limiting
  - Gzip compression
  - SSL/TLS support
  - Request logging
  - Health checks

```bash
# Check Nginx configuration
docker-compose exec nginx nginx -t

# View access logs
docker-compose logs -f nginx
```

#### 6. Adminer (Development)
- **URL:** `http://localhost:8080`
- **System:** PostgreSQL
- **Server:** postgres
- **User:** swiftpay_user
- **Password:** From .env

### Configuration Files

#### `.env.docker` → `.env`
Essential variables:
- `DB_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `GMAIL_USER` / `GMAIL_PASSWORD` - Email service
- `FIREBASE_CONFIG_PATH` - Firebase admin SDK

#### `docker-compose.yml`
- Service definitions
- Volume configuration
- Network setup
- Environment variables
- Health checks
- Dependencies

#### `Dockerfile` (Backend)
- Multi-stage build
- Non-root user
- Health check
- Signal handling (dumb-init)
- 1.2GB → 150MB final image

#### `nginx.conf`
- API routing (/api)
- Frontend routing (/)
- Rate limiting
- Compression
- SSL configuration
- Security headers

### Common Tasks

#### Initialize Database

```bash
# Automatic on startup
docker-compose up postgres

# Manual
docker-compose exec postgres psql -U swiftpay_user -d swiftpay < backend/migrations.sql
docker-compose exec postgres psql -U swiftpay_user -d swiftpay < backend/migrations_phase2.sql
```

#### Rebuild Images

```bash
# Backend only
docker-compose build backend

# Frontend only
docker-compose build frontend

# All services
docker-compose build --no-cache

# Rebuild and start
docker-compose up -d --build
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

#### Database Backup/Restore

```bash
# Backup
docker-compose exec postgres pg_dump \
  -U swiftpay_user -d swiftpay \
  | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup.sql.gz | docker exec -i swiftpay-postgres \
  psql -U swiftpay_user -d swiftpay
```

#### Scale Services

```bash
# Run multiple backend instances
docker-compose up -d --scale backend=3

# Nginx will load balance between them
```

### Production Deployment

#### SSL/TLS Configuration

1. Uncomment SSL section in `nginx.conf`
2. Provide certificates at `./nginx/ssl/`
3. Use Let's Encrypt for free certs:

```bash
docker run -it --rm -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone -d yourdomain.com
```

#### Environment Variables

Never commit sensitive data. Use:
- `.env` file (gitignored)
- Docker secrets (Swarm)
- Environment management tools
- CI/CD secrets

```bash
# Secure environment setup
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)

# Create .env
cat > .env << EOF
DB_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF
```

#### Monitoring & Metrics

```bash
# View resource usage
docker-compose stats

# Health check endpoints
curl http://localhost/health
curl http://localhost:3000/health
```

#### Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (warning: data loss)
docker-compose down -v

# Prune unused images
docker image prune -a

# Complete cleanup
docker system prune -a
```

### Troubleshooting

#### Database Connection Error
```bash
# Check if postgres is running
docker-compose ps postgres

# Check network
docker network ls
docker network inspect swiftpay_swiftpay-network

# Restart
docker-compose restart postgres
```

#### Redis Memory Issues
```bash
# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Clear cache
docker-compose exec redis redis-cli FLUSHALL
```

#### Nginx Routing Issues
```bash
# Validate config
docker-compose exec nginx nginx -t

# Test backend connectivity
docker-compose exec nginx curl http://backend:3000/health
```

#### Frontend Not Accessible
```bash
# Check if frontend is running
docker-compose ps frontend

# View logs
docker-compose logs frontend

# Check Expo issues
docker-compose exec frontend expo --version
```

### Performance Tips

1. **Use named volumes** for persistent data
2. **Enable Gzip** in Nginx (default enabled)
3. **Redis caching** for currency rates (24h TTL)
4. **Database indexes** on frequently queried columns
5. **Connection pooling** in PostgreSQL
6. **Rate limiting** to prevent abuse (default: 50 req/15min)

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Database password is strong (32+ chars)
- [ ] JWT secret is strong (32+ chars)
- [ ] Redis password is set and strong
- [ ] PostgreSQL user is non-root
- [ ] Nginx has rate limiting enabled
- [ ] HTTPS/SSL is configured in production
- [ ] Firebase credentials are secret
- [ ] No sensitive data in logs
- [ ] Regular database backups

### References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)
- [Best Practices for Production](https://docs.docker.com/develop/dev-best-practices/)
