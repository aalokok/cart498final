#!/bin/bash
set -e

echo "===== Starting Vercel Deployment ====="

# Build backend
echo "Building backend..."
npm ci
npm run build
echo "Backend built successfully!"

# Build frontend
echo "Building frontend..."
cd frontend
npm ci
npm run build
echo "Frontend built successfully!"

# Create dist directory if it doesn't exist
mkdir -p dist/public

# Copy frontend dist to backend public
echo "Copying frontend files to dist/public..."
cp -r dist/* ../dist/public/
cd ..

# Show the status
echo "Final structure:"
ls -la dist
ls -la dist/public

echo "===== Deployment preparation complete! ====="
echo "You can now deploy to Vercel using:"
echo "vercel --prod" 