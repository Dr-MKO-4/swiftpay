@echo off
REM SwiftPay Deployment Scripts - Windows Batch
REM Helper scripts for common deployment tasks

setlocal enabledelayedexpansion

echo.
echo ===== SwiftPay Deployment Helper =====
echo.

REM Function to check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose is not installed or not in PATH
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

if "%1"=="" goto show_help
if "%1"=="start" goto start_services
if "%1"=="stop" goto stop_services
if "%1"=="logs" goto view_logs
if "%1"=="backup" goto backup_db
if "%1"=="restore" goto restore_db
if "%1"=="health" goto health_check
if "%1"=="rebuild" goto rebuild_images
if "%1"=="clear-cache" goto clear_cache
if "%1"=="help" goto show_help
if "%1"=="-h" goto show_help

echo ERROR: Unknown command: %1
goto show_help

:start_services
echo Starting SwiftPay services...
if not exist .env (
    echo ERROR: .env file not found. Copy .env.docker to .env and configure.
    exit /b 1
)
docker-compose up -d
echo Services started. Waiting for readiness...
REM Wait for services
timeout /t 5 /nobreak
docker-compose ps
echo.
echo Access points:
echo   Frontend: http://localhost
echo   Backend API: http://localhost/api
echo   Database Admin: http://localhost:8080
echo   Expo Dev: http://localhost:8081
goto end

:stop_services
echo Stopping SwiftPay services...
docker-compose down
echo Services stopped.
goto end

:view_logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:backup_db
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set backup_file=backup_!mydate!_!mytime!.sql.gz
echo Backing up database to !backup_file!...
REM Note: Windows batch doesn't have built-in gzip, so we use docker
docker-compose exec postgres pg_dump -U postgres -d swiftpay | type > !backup_file!
echo Backup complete: !backup_file!
goto end

:restore_db
if "%2"=="" (
    echo Usage: %0 restore ^<backup_file^>
    exit /b 1
)
if not exist "%2" (
    echo ERROR: Backup file not found: %2
    exit /b 1
)
echo Restoring database from %2...
type "%2" | docker-compose exec postgres psql -U postgres -d swiftpay
echo Restore complete.
goto end

:health_check
echo Checking service health...
docker-compose ps
goto end

:rebuild_images
echo Rebuilding Docker images...
docker-compose build --no-cache
echo Rebuild complete.
goto end

:clear_cache
echo Clearing Redis cache...
docker-compose exec redis redis-cli FLUSHALL
echo Cache cleared.
goto end

:show_help
echo SwiftPay Deployment Helper
echo.
echo Usage: %0 ^<command^> [options]
echo.
echo Commands:
echo   start              Start all services
echo   stop               Stop all services
echo   logs [service]     View logs (optional: specific service)
echo   backup             Backup database
echo   restore ^<file^>     Restore database from backup
echo   health             Check service health
echo   rebuild            Rebuild Docker images
echo   clear-cache        Clear Redis cache
echo   help               Show this help message
echo.
echo Examples:
echo   %0 start
echo   %0 logs backend
echo   %0 backup
echo   %0 restore backup_20260317_120000.sql.gz
echo.

:end
endlocal
