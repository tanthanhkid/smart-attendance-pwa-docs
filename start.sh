#!/bin/bash

set -e

echo "========================================"
echo "  Smart Attendance PWA - Local Start"
echo "========================================"
echo

if [ ! -f ".env" ]; then
  echo "[1/6] Creating .env from .env.example..."
  cp .env.example .env
else
  echo "[1/6] .env already exists, skipping..."
fi

if [ ! -d "node_modules" ]; then
  echo "[2/6] Installing dependencies..."
  pnpm install
else
  echo "[2/6] Dependencies already installed."
fi

echo "[3/6] Checking PostgreSQL from DATABASE_URL..."
if ! pnpm check:db; then
  echo "ERROR: PostgreSQL is not reachable from DATABASE_URL in .env."
  echo "Start your local PostgreSQL service or update DATABASE_URL in .env."
  exit 1
fi
echo "PostgreSQL is reachable."

echo "[4/6] Syncing database schema..."
pnpm --filter @smart-attendance/api db:push

echo "[5/6] Seeding demo data..."
pnpm --filter @smart-attendance/api db:seed

echo "[6/6] Starting development servers..."
pnpm dev
