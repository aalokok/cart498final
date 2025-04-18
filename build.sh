#!/bin/bash
set -e

# Build Backend
echo "Building backend..."
npm ci
npm run build
echo "Backend build complete."

# Build Frontend
echo "Building frontend..."
cd frontend
npm ci
npm run build
echo "Frontend build complete."

# Check output
echo "Checking build output..."
ls -la ../dist
ls -la dist

echo "Build process complete!" 