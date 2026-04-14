#!/bin/bash

# SwiftPay Deployment Scripts
# Helper scripts for common deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SwiftPay Deployment Helper${NC}\n"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Function to validate environment variables
validate_env() {
    local required_vars=(
        "DB_USER"
        "DB_PASSWORD"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "GMAIL_USER"
        "GMAIL_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Environment variable $var is not set"
            return 1
        fi
    done
    
    print_status "All required environment variables are set"
}

# Function to initialize application
init() {
    print_info "Initializing SwiftPay..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        cp .env.docker .env
        print_error "Please edit .env with your configuration values"
        exit 1
    fi
    
    # Load environment variables
    export $(cat .env | grep -v '#' | xargs)
    
    # Validate environment
    if ! validate_env; then
        exit 1
    fi
    
    # Check Docker
    check_docker
    
    print_status "Initialization complete"
}

# Function to start services
start() {
    print_info "Starting SwiftPay services..."
    init
    
    docker-compose up -d
    
    print_status "Services started"
    print_info "Waiting for services to be ready..."
    
    # Wait for database to be ready
    for i in {1..30}; do
        if docker-compose exec postgres pg_isready -U $DB_USER &> /dev/null; then
            print_status "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
        sleep 1
    done
    
    # Wait for Redis to be ready
    for i in {1..30}; do
        if docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping &> /dev/null; then
            print_status "Redis is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Redis failed to start"
            exit 1
        fi
        sleep 1
    done
    
    print_status "All services are ready"
    
    print_info "Access points:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost/api"
    echo "  Database Admin: http://localhost:8080"
    echo "  Expo Dev: http://localhost:8081"
}

# Function to stop services
stop() {
    print_info "Stopping SwiftPay services..."
    docker-compose down
    print_status "Services stopped"
}

# Function to view logs
logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f $service
    fi
}

# Function to backup database
backup() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    print_info "Backing up database to $backup_file..."
    
    export $(cat .env | grep -v '#' | xargs)
    
    docker-compose exec postgres pg_dump \
        -U $DB_USER -d $DB_NAME | \
        gzip > $backup_file
    
    print_status "Backup complete: $backup_file"
}

# Function to restore database
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_error "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_info "Restoring database from $backup_file..."
    
    export $(cat .env | grep -v '#' | xargs)
    
    gunzip < $backup_file | \
    docker-compose exec postgres psql \
        -U $DB_USER -d $DB_NAME
    
    print_status "Restore complete"
}

# Function to clear cache
clear_cache() {
    print_info "Clearing Redis cache..."
    
    export $(cat .env | grep -v '#' | xargs)
    
    docker-compose exec redis redis-cli \
        -a $REDIS_PASSWORD FLUSHALL
    
    print_status "Cache cleared"
}

# Function to health check
health_check() {
    print_info "Checking service health..."
    
    local services=("backend" "postgres" "redis" "nginx")
    
    for service in "${services[@]}"; do
        status=$(docker-compose ps $service | grep -o "Up\|Exited")
        if [ "$status" == "Up" ]; then
            print_status "$service is running"
        else
            print_error "$service is not running"
        fi
    done
}

# Function to rebuild images
rebuild() {
    print_info "Rebuilding Docker images..."
    docker-compose build --no-cache
    print_status "Rebuild complete"
}

# Main menu
show_help() {
    cat << EOF
${GREEN}SwiftPay Deployment Helper${NC}

Usage: $0 <command> [options]

Commands:
  start              Start all services
  stop               Stop all services
  logs [service]     View logs (optional: specific service)
  backup             Backup database
  restore <file>     Restore database from backup
  health             Check service health
  rebuild            Rebuild Docker images
  clear-cache        Clear Redis cache
  help               Show this help message

Examples:
  $0 start
  $0 logs backend
  $0 backup
  $0 restore backup_20260317_120000.sql.gz

EOF
}

# Main script logic
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    logs)
        logs "$2"
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    health)
        health_check
        ;;
    rebuild)
        rebuild
        ;;
    clear-cache)
        clear_cache
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
