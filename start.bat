@echo off
chcp 65001 >nul
title Smart Attendance PWA - Local Start

echo ========================================
echo   Smart Attendance PWA - Local Start
echo ========================================
echo.

if not exist ".env" (
    echo [1/6] Creating .env from .env.example...
    copy .env.example .env >nul
    echo   Done!
) else (
    echo [1/6] .env already exists, skipping...
)

if not exist "node_modules" (
    echo [2/6] Installing dependencies...
    call pnpm install
    if errorlevel 1 exit /b 1
) else (
    echo [2/6] Dependencies already installed.
)

echo [3/6] Checking PostgreSQL from DATABASE_URL...
call pnpm check:db
if errorlevel 1 (
    echo   ERROR: PostgreSQL is not reachable from DATABASE_URL in .env.
    echo   Start your local PostgreSQL service or update DATABASE_URL in .env.
    pause
    exit /b 1
)
echo   PostgreSQL is reachable.

echo [4/6] Syncing database schema...
call pnpm --filter @smart-attendance/api db:push
if errorlevel 1 exit /b 1

echo [5/6] Seeding demo data...
call pnpm --filter @smart-attendance/api db:seed
if errorlevel 1 exit /b 1

echo [6/6] Starting development servers...
start "Smart Attendance API" cmd /k "cd /d %~dp0 && pnpm dev:api"
start "Smart Attendance Web" cmd /k "cd /d %~dp0 && pnpm dev:web"

echo.
echo ========================================
echo   Local services started
echo ========================================
echo   Web:     http://localhost:3000
echo   API:     http://localhost:4000
echo   Swagger: http://localhost:4000/docs
echo ========================================
echo.
pause
