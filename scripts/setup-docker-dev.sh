#!/usr/bin/env bash
#
# Setup a local Splunk Enterprise development container and bind mount the app
# from ./api_input_connect into /opt/splunk/etc/apps/api_input_connect inside the container.
#
# Requirements:
#   - Docker installed and available on PATH
#
# Defaults can be overridden via environment variables:
#   CONTAINER_NAME   (default: splunk-dev)
#   SPLUNK_IMAGE     (default: splunk/splunk:latest)
#   SPLUNK_PASSWORD  (default: Changeme123!)
#   APP_DIR          (default: "$(pwd)/api_input_connect")
#
# Example:
#   CONTAINER_NAME=my-splunk-dev SPLUNK_PASSWORD='Str0ngP@ss!' ./scripts/setup-local-docker-dev.sh
#
set -euo pipefail

CONTAINER_NAME=${CONTAINER_NAME:-splunk-dev}
SPLUNK_IMAGE=${SPLUNK_IMAGE:-splunk/splunk:latest}
SPLUNK_PASSWORD=${SPLUNK_PASSWORD:-changeme!}
APP_DIR=${APP_DIR:-$(pwd)/api_input_connect}
APP_MOUNT_TARGET=/opt/splunk/etc/apps/api_input_connect

HTTP_PORT=${HTTP_PORT:-8000}     # Splunk Web
MGMT_PORT=${MGMT_PORT:-8089}     # Splunk Management
RECV_PORT=${RECV_PORT:-9997}     # Indexer receiving
HEC_PORT=${HEC_PORT:-8088}       # HTTP Event Collector

die() {
  echo "[ERROR] $*" 1>&2
  exit 1
}

info() {
  echo "[INFO] $*"
}

# Check docker availability
command -v docker >/dev/null || die "Docker is not installed or not on PATH."

# Verify app directory exists
if [ ! -d "$APP_DIR" ]; then
  die "App directory not found: $APP_DIR"
fi

# Show summary
info "Container Name  : $CONTAINER_NAME"
info "Image           : $SPLUNK_IMAGE"
info "Splunk Password : (admin / $SPLUNK_PASSWORD)"
info "Mount           : $APP_DIR -> $APP_MOUNT_TARGET"
info "Ports           : $HTTP_PORT:$HTTP_PORT (web), $MGMT_PORT:$MGMT_PORT (mgmt), $RECV_PORT:$RECV_PORT (recv), $HEC_PORT:$HEC_PORT (HEC)"

# Clean up existing container with the same name (if any)
if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
  info "Existing container '$CONTAINER_NAME' found. Removing..."
  docker rm -f "$CONTAINER_NAME" >/dev/null || die "Failed to remove existing container '$CONTAINER_NAME'"
fi

# Run Splunk container
info "Starting Splunk container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$HTTP_PORT:8000" \
  -p "$MGMT_PORT:8089" \
  -p "$RECV_PORT:9997" \
  -p "$HEC_PORT:8088" \
  -v "$APP_DIR:$APP_MOUNT_TARGET" \
  -e SPLUNK_START_ARGS="--accept-license --no-prompt" \
  -e SPLUNK_GENERAL_TERMS="--accept-sgt-current-at-splunk-com" \
  -e SPLUNK_PASSWORD="$SPLUNK_PASSWORD" \
  "$SPLUNK_IMAGE" >/dev/null

info "Container '$CONTAINER_NAME' started."
echo
info "Your app is mounted: host '$APP_DIR' -> container '$APP_MOUNT_TARGET'"
info "Splunk Web UI will be available at: http://localhost:$HTTP_PORT"
info "Login with: admin / $SPLUNK_PASSWORD"
echo
info "Startup can take 1-3 minutes. To follow logs:"
echo "  docker logs -f $CONTAINER_NAME"
echo
info "To stop and remove the dev container later:"
echo "  docker rm -f $CONTAINER_NAME"