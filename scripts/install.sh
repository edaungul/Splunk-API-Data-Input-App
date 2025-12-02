#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Navigate to the client directory
cd "$PROJECT_ROOT/client" || exit 1

# Install npm dependencies
echo "Installing npm dependencies..."
npm install || exit 1

# Build the client
echo "Building client..."
npm run build || exit 1

echo "Build complete. Output: $PROJECT_ROOT/api_input_connect/appserver/static/client"