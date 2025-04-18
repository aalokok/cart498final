#!/bin/bash
# Build script for Vercel deployment

# Build backend
echo "Building backend..."
npm install
npm run build

# Build frontend
echo "Building frontend..."
cd frontend
npm install
# Use the vercel-build helper script
npm run vercel-build

echo "Build process completed" 