#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Project root: $PROJECT_ROOT"

# Navigate to the client directory and build
echo "Building client..."
cd "$PROJECT_ROOT/client" || exit 1

# Install npm dependencies
npm install || exit 1

# Build the client (outputs to api_input_connect/appserver/static/client)
npm run build || exit 1

# Return to project root
cd "$PROJECT_ROOT" || exit 1

# Create a tar.gz archive of the app folder, excluding unnecessary or sensitive files
echo "Creating tar.gz package..."
tar \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='api_input_connect/metadata/local.meta' \
  --exclude='api_input_connect/local' \
  --exclude='api_input_connect/.*' \
  -cvzf api_input_connect.tar.gz api_input_connect

echo ""
echo "Package created: $PROJECT_ROOT/api_input_connect.tar.gz"

# Check if the first argument is --app-inspect
if [[ "$1" == "--app-inspect" ]]; then
  # Run Splunk AppInspect with the --app-inspect flag only
  echo "Running AppInspect..."
  splunk-appinspect inspect api_input_connect.tar.gz --app-inspect
fi