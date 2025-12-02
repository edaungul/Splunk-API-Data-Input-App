#!/bin/bash

CONTAINER_NAME=${CONTAINER_NAME:-splunk-dev}

docker exec -u splunk "$CONTAINER_NAME" /opt/splunk/bin/splunk restart
