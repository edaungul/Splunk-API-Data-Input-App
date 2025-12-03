#!/bin/bash

CONTAINER_NAME=${CONTAINER_NAME:-splunk-dev}
APP_NAME="api_input_connect"
SPLUNK_USER="admin"
SPLUNK_PASS=${SPLUNK_PASSWORD:-changeme!}

if [[ "$1" == "--reload-only" ]]; then
  docker exec -u splunk "$CONTAINER_NAME" /opt/splunk/bin/splunk _internal call /services/apps/local/"$APP_NAME"/_reload -auth "$SPLUNK_USER:$SPLUNK_PASS" && \
  echo "Reloaded app $APP_NAME inside container $CONTAINER_NAME"
  exit 0
fi

cd client && npm install && npm run build && cd .. && \
docker exec -u splunk "$CONTAINER_NAME" /opt/splunk/bin/splunk _internal call /services/apps/local/"$APP_NAME"/_reload -auth "$SPLUNK_USER:$SPLUNK_PASS" && \
echo "Reloaded app $APP_NAME inside container $CONTAINER_NAME"
