export type DataInputMode = 'overwrite';

export interface DataInputAppConfig {
    _key?: string;
    name: string;
    input_type: string;
    url: string;
    http_headers: string[];
    excluded_json_paths: string[];
    enabled: boolean;
    mode: DataInputMode;
    cron_expression: string;
    selected_output_location: string;
    /** Array paths to explode into separate events (e.g., ["$.products", "$.users"]) */
    separate_array_paths?: string[];
}