#!/usr/bin/env python3
import os
import sys
import json
import requests
import xml.etree.ElementTree as ET
import logging

# Add local lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

# Configure logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)


def get_session_key():
    try:
        input_str = sys.stdin.read()
        logger.debug(f"Input received: {input_str}")
        return input_str.strip()
    except Exception as e:
        logger.error(f"Failed to get session key: {e}")
        return None


# Constants
SPLUNKD_PORT = os.environ.get('SPLUNKD_PORT', '8089')
APP_NAME = 'api_input_connect'
COLLECTION = 'api_input_connect_config'
URL = f'https://localhost:{SPLUNKD_PORT}/servicesNS/nobody/{APP_NAME}/storage/collections/data/{COLLECTION}'
SESSION_KEY = get_session_key()
# Disable SSL warnings for self-signed certs
requests.packages.urllib3.disable_warnings()


def call_api(method, url, data=None, headers=None, **kwargs):
    """
    Helper to call an API with proper headers and error handling.
    method: 'get', 'post', etc.
    url: full URL to call
    data: dict or JSON string for POST/PUT
    headers: additional headers
    kwargs: passed to requests.request
    """
    if headers is None:
        headers = {}
    headers.setdefault('Content-Type', 'application/json')
    try:
        resp = requests.request(
            method,
            url,
            headers=headers,
            data=json.dumps(data) if data is not None and not isinstance(data, str) else data,
            verify=False,
            **kwargs
        )
        resp.raise_for_status()
        logger.info(f"response {resp} for {method} {url}")
        if resp.content:
            return resp.json()
        return None
    except Exception as e:
        logger.error(f"API {method.upper()} {url} failed: {e}")
        return None

def call_splunk_api(method, url, session_key=None, data=None, headers=None, **kwargs):
    """
    Helper to call Splunk API with session key for Authorization header.
    """
    if headers is None:
        headers = {}
    if session_key:
        headers['Authorization'] = f'Splunk {session_key}'
    return call_api(method, url, data=data, headers=headers, **kwargs)

def parse_headers(header_list):
    """
    Converts a list of header strings in the format '<name>: value'
    to a dictionary suitable for requests.
    """
    headers = {}
    for header in header_list:
        if ':' in header:
            name, value = header.split(':', 1)
            headers[name.strip()] = value.strip()
    return headers

def get_api_data(config):
    url = config.get('url')
    excluded_paths = config.get('excluded_json_paths', [])
    try:
        headers = parse_headers(config.get('headers', []))
        data = call_splunk_api('get', url, headers=headers)
        if data is None:
            raise Exception('No data returned from API')
        # Apply JSONPath exclusions if any
        if excluded_paths:
            try:
                from jsonpath_ng import parse
            except ImportError:
                logger.error(
                    "jsonpath-ng is required for exclusions. Please install it.")
                return data
            for path in excluded_paths:
                jsonpath_expr = parse(path)
                for match in jsonpath_expr.find(data):
                    context = match.context.value
                    if isinstance(context, dict):
                        context.pop(match.path.fields[0], None)
                    elif isinstance(context, list) and isinstance(match.path.index, int):
                        if 0 <= match.path.index < len(context):
                            context.pop(match.path.index)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch or process API data: {e}")
        return None

def write_to_kvstore(app, collection, data):
    logger.info(f"Writing to KV Store collection: {collection}")
    url = f"https://localhost:{SPLUNKD_PORT}/servicesNS/nobody/{app}/storage/collections/data/{collection}"
    if isinstance(data, list):
        results = []
        for item in data:
            result = call_splunk_api('post', url, session_key=SESSION_KEY, data=item)
            results.append(result)
        return results
    else:
        return call_splunk_api('post', url, session_key=SESSION_KEY, data=data)

def empty_kvstore(app, collection):
    logger.info(f"Emptying KV Store collection: {collection}")
    url = f"https://localhost:{SPLUNKD_PORT}/servicesNS/nobody/{app}/storage/collections/data/{collection}/"
    call_splunk_api('delete', url, session_key=SESSION_KEY)
    logger.info(f"Successfully emptied KV Store collection: {collection}")
    return True


def write_to_index_via_hec(index_name, data):
    """
    Write data to a Splunk index using the HTTP Event Collector (HEC).
    Uses the receivers/simple endpoint which accepts raw data via session key auth.
    """
    logger.info(f"Writing to index: {index_name}")
    url = f"https://localhost:{SPLUNKD_PORT}/services/receivers/simple?index={index_name}&sourcetype=_json"

    try:
        if isinstance(data, list):
            # Send each item as a separate event
            for item in data:
                event_data = json.dumps(item)
                result = call_splunk_api('post', url, session_key=SESSION_KEY, data=event_data)
                if result is None:
                    logger.warning(f"Failed to write event to index {index_name}")
        else:
            # Single event
            event_data = json.dumps(data)
            result = call_splunk_api('post', url, session_key=SESSION_KEY, data=event_data)
            if result is None:
                logger.warning(f"Failed to write event to index {index_name}")

        logger.info(f"Successfully wrote data to index: {index_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to write to index {index_name}: {e}")
        return False


def get_kvstore_details_from_config(config):
    return config.get('selected_output_location', "/").split('/')


def get_value_at_path(data, path):
    """
    Get value at a JSONPath from an object.
    Supports simple paths like $.products or $.data.items
    """
    if path == '$':
        return data

    # Remove leading $. if present
    path = path.lstrip('$').lstrip('.')
    if not path:
        return data

    parts = path.split('.')
    current = data

    for part in parts:
        if current is None:
            return None
        if not isinstance(current, dict):
            return None
        current = current.get(part)

    return current


def separate_arrays_into_events(data, separate_array_paths):
    """
    Generate separate events from data based on selected array paths.
    Each array item becomes its own event with metadata about its source.
    """
    if not separate_array_paths:
        # No separation configured, return as single item list
        return [data] if not isinstance(data, list) else data

    events = []

    for array_path in separate_array_paths:
        array_data = get_value_at_path(data, array_path)
        if isinstance(array_data, list):
            # Get the field name from the path (e.g., "products" from "$.products")
            field_name = array_path.split('.')[-1] if '.' in array_path else array_path.lstrip('$')

            for item in array_data:
                if isinstance(item, dict):
                    event = {
                        '_source_array': field_name,
                        '_array_path': array_path,
                        **item
                    }
                else:
                    event = {
                        '_source_array': field_name,
                        '_array_path': array_path,
                        'value': item
                    }
                events.append(event)

    # If no events were generated from arrays, return original data
    if not events:
        return [data] if not isinstance(data, list) else data

    logger.info(f"Separated {len(events)} events from {len(separate_array_paths)} array path(s)")
    return events


def main():
    if not SESSION_KEY:
        logger.error("No session key found, exiting.")
        return
    try:
        app_config = call_splunk_api('get', URL, session_key=SESSION_KEY)
        if app_config is None:
            logger.error("Failed to fetch app config.")
            return
        logger.info(f"App config: {json.dumps(app_config)}")
        for item in app_config:
            input_type = item.get('input_type')
            output_name = item.get('selected_output_location')
            if not output_name:
                logger.info(f"Skipping item with no output location: {item}")
                continue
            if input_type == 'kvstore':
                api_data = get_api_data(item)
                if api_data is None:
                    logger.error(f"Failed to fetch API data for kvstore input: {item.get('name')}")
                    continue
                # Apply array separation if configured
                separate_paths = item.get('separate_array_paths', [])
                if separate_paths:
                    api_data = separate_arrays_into_events(api_data, separate_paths)
                app, collection = get_kvstore_details_from_config(item)
                if item.get('mode') == 'overwrite':
                    empty_kvstore(app, collection)
                write_to_kvstore(app, collection, api_data)
            elif input_type == 'index':
                api_data = get_api_data(item)
                if api_data is None:
                    logger.error(f"Failed to fetch API data for index input: {item.get('name')}")
                    continue
                # Apply array separation if configured
                separate_paths = item.get('separate_array_paths', [])
                if separate_paths:
                    api_data = separate_arrays_into_events(api_data, separate_paths)
                index_name = output_name  # For index, selected_output_location is just the index name
                write_to_index_via_hec(index_name, api_data)
    except Exception as e:
        logger.error(f"ERROR: {e}")

if __name__ == '__main__':
    main()
