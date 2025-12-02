/**
 * Utility functions for detecting and processing arrays in JSON data
 */

export interface DetectedArray {
    path: string;
    length: number;
    sampleItem: unknown;
}

/**
 * Recursively find all arrays in a JSON object and return their paths
 */
export function detectArraysInJson(data: unknown, currentPath: string = '$'): DetectedArray[] {
    const arrays: DetectedArray[] = [];

    if (Array.isArray(data)) {
        arrays.push({
            path: currentPath,
            length: data.length,
            sampleItem: data[0]
        });
        // Also check nested arrays in first item
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
            const nested = detectArraysInJson(data[0], `${currentPath}[*]`);
            arrays.push(...nested);
        }
    } else if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            const nested = detectArraysInJson(value, `${currentPath}.${key}`);
            arrays.push(...nested);
        }
    }

    return arrays;
}

/**
 * Get value at a JSONPath from an object
 * Supports simple paths like $.products or $.data.items
 */
export function getValueAtPath(data: unknown, path: string): unknown {
    if (path === '$') return data;

    const parts = path.replace(/^\$\.?/, '').split('.');
    let current: unknown = data;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }

    return current;
}

/**
 * Generate separate events from data based on selected array paths
 */
export function generateSeparateEvents(
    data: unknown,
    separateArrayPaths: string[]
): unknown[] {
    if (!separateArrayPaths || separateArrayPaths.length === 0) {
        // No separation, return as single event
        return [data];
    }

    const events: unknown[] = [];

    for (const arrayPath of separateArrayPaths) {
        const arrayData = getValueAtPath(data, arrayPath);
        if (Array.isArray(arrayData)) {
            // Get the field name from the path (e.g., "products" from "$.products")
            const fieldName = arrayPath.split('.').pop() || 'item';

            for (const item of arrayData) {
                events.push({
                    _source_array: fieldName,
                    _array_path: arrayPath,
                    ...( typeof item === 'object' && item !== null ? item : { value: item })
                });
            }
        }
    }

    // If no events were generated from arrays, return original data
    if (events.length === 0) {
        return [data];
    }

    return events;
}

/**
 * Format data as it would appear in Splunk (JSON event format)
 */
export function formatAsSplunkEvent(data: unknown, _index?: number): string {
    const event = {
        time: Math.floor(Date.now() / 1000),
        event: data
    };

    return JSON.stringify(event, null, 2);
}
