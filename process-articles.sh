#!/bin/bash

# Navigate to project directory
cd "$(dirname "$0")"

# Run the article processing script
echo "Starting article processing with one-minute intervals..."
npx ts-node src/scripts/processArticlesWithInterval.ts
