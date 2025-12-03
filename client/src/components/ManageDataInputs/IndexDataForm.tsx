import TrashCanCross from '@splunk/react-icons/TrashCanCross';
import Button from '@splunk/react-ui/Button';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import FormRows from '@splunk/react-ui/FormRows';
import Heading from '@splunk/react-ui/Heading';
import Select from '@splunk/react-ui/Select';
import Text from '@splunk/react-ui/Text';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import React, { useState } from 'react';
import { getAllIndexNames } from '../../utils/splunk';
import CreateNewIndex from '../DataInputs/Index/CreateNewIndex';
import ArrayFieldSelector from '../Json/ArrayFieldSelector';
import EventPreviewModal from '../Json/EventPreviewModal';
import type { DataInputAppConfig, DataInputMode } from './DataInputs.types';


interface IndexDataFormProps {
    dataInputAppConfig?: DataInputAppConfig;
    setDataInputAppConfig?: React.Dispatch<React.SetStateAction<DataInputAppConfig>>;
    fetchDataPreview: (url: string, jsonPaths: string[], httpHeaders?: string[]) => Promise<void>;
    loading: boolean;
    handleSave: (formData: DataInputAppConfig, clearInputs?: () => void) => void;
    setError: (message: string) => void;
    onJSONPathsChange: (jsonPaths: string[]) => void;
    setJsonPreview?: (data: string) => void;
    onAddExcludePathRef?: (fn: (path: string) => void) => void;
    rawData?: unknown;
}

const IndexDataForm: React.FC<IndexDataFormProps> = (props) => {
    const config: Partial<DataInputAppConfig> = props.dataInputAppConfig || {};
    const modalToggle = React.useRef<HTMLButtonElement | null>(null);
    const previewModalToggle = React.useRef<HTMLButtonElement | null>(null);
    const [indexNames, setIndexNames] = useState<string[]>([]);
    const [showCreateIndexModal, setShowCreateIndexModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [name, setInputName] = useState(config.name ?? '');
    const [dataInputType] = useState<string>('index');
    const [url, setUrl] = useState(config.url ?? "https://dummyjson.com/products");
    const [http_headers, setHttpHeaders] = useState<string[]>(config.http_headers ?? [""]);
    const [cronExpression, setCronExpression] = useState(config.cron_expression ?? '0 * * * *');
    const [selected_output_location, setSelectedIndex] = useState<string>(config.selected_output_location ?? '');
    const [mode, setMode] = useState<DataInputMode>(config.mode ?? 'overwrite');
    const [separateArrayPaths, setSeparateArrayPaths] = useState<string[]>(config.separate_array_paths ?? []);


    const updateConfigField = <K extends keyof DataInputAppConfig>(
        key: K,
        value: DataInputAppConfig[K]
    ) => {
        if (props.setDataInputAppConfig) {
            props.setDataInputAppConfig(prev => ({
                ...prev,
                [key]: value
            }));
        }
    };

    // Use a string array for JSONPath values
    const [jsonPathValues, setJsonPathValues] = useState<string[]>(
        config.excluded_json_paths && config.excluded_json_paths.length > 0
            ? config.excluded_json_paths
            : [""]
    );

    React.useEffect(() => {
        getAllIndexNames().then(result => {
            setIndexNames(result);
        });
    }, []);

    // Sync form state when dataInputAppConfig changes (for edit mode)
    React.useEffect(() => {
        if (props.dataInputAppConfig) {
            const config = props.dataInputAppConfig;
            setInputName(config.name ?? '');
            setUrl(config.url ?? 'https://dummyjson.com/products');
            setHttpHeaders(config.http_headers ?? ['']);
            setCronExpression(config.cron_expression ?? '0 * * * *');
            setSelectedIndex(config.selected_output_location ?? '');
            setMode(config.mode ?? 'overwrite');
            setSeparateArrayPaths(config.separate_array_paths ?? []);
            setJsonPathValues(
                config.excluded_json_paths && config.excluded_json_paths.length > 0
                    ? config.excluded_json_paths
                    : ['']
            );
        }
    }, [props.dataInputAppConfig]);

    // Register the addExcludePath function with the parent
    React.useEffect(() => {
        if (props.onAddExcludePathRef) {
            props.onAddExcludePathRef((path: string) => {
                setJsonPathValues((prev) => {
                    // Don't add duplicates
                    if (prev.includes(path)) return prev;
                    // If first row is empty, replace it; otherwise add new row
                    const updated = prev[0] === '' ? [path] : [...prev, path];
                    props.onJSONPathsChange(updated.filter(Boolean));
                    updateConfigField('excluded_json_paths', updated.filter(Boolean));
                    return updated;
                });
            });
        }
    }, [props.onAddExcludePathRef]);

    // Add new JSONPath row
    const handleNewJsonPathExclusion = () => {
        setJsonPathValues((prev) => {
            const updated = [...prev, ""];
            props.onJSONPathsChange(updated.filter(Boolean));
            updateConfigField('excluded_json_paths', updated.filter(Boolean));
            return updated;
        });
    };

    // Remove a JSONPath row by index
    const handleRemoveJsonPathRow = (index: number) => {
        if (index === 0) return; // Prevent removing the first row
        setJsonPathValues((prev) => {
            if (prev.length === 1) return prev; // Prevent removing the last row
            const updated = prev.filter((_, i) => i !== index);
            props.onJSONPathsChange(updated.filter(Boolean));
            updateConfigField('excluded_json_paths', updated.filter(Boolean));
            return updated;
        });
    };

    // Handle Text value change in a row (accept value: string)
    const handleJsonPathTextChange = (value: string, { index }: { index: number }) => {
        setJsonPathValues((prev) => {
            const updated = prev.map((v, i) => (i === index ? value : v));
            props.onJSONPathsChange(updated.filter(Boolean));
            updateConfigField('excluded_json_paths', updated.filter(Boolean));
            return updated;
        });
    };

    // Render controlled rows with ColumnLayout.Row
    const controlledJsonPathRows = jsonPathValues.map((value, i) => (
        <FormRows.Row index={i} key={i}>
            <div style={{ display: 'flex'}}>
                <div style={{ flexGrow: 1, marginRight: '8px', minWidth: 0 }}>
                    <Text
                        style={{ width: '100%', fontSize: '1.1em' }}
                        placeholder="e.g. $.bar[*].baz"
                        value={value}
                        onChange={(_, { value }) => handleJsonPathTextChange(value, { index: i })}
                    />
                </div>
                {i !== 0 && (
                    <Button
                        inline
                        appearance="secondary"
                        onClick={() => handleRemoveJsonPathRow(i)}
                        label=""
                        icon={<TrashCanCross />}
                    />
                )}
            </div>
        </FormRows.Row>
    ));

    // Add new HTTP header row
    const handleNewHttpHeader = () => {
        setHttpHeaders((prev) => [...prev, ""]);
    };

    // Remove an HTTP header row by index
    const handleRemoveHttpHeader = (index: number) => {
        if (index === 0) return; // Prevent removing the first row
        setHttpHeaders((prev) => {
            if (prev.length === 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    // Handle Text value change in a header row
    const handleHttpHeaderTextChange = (value: string, { index }: { index: number }) => {
        setHttpHeaders((prev) => {
            const updated = prev.map((v, i) => (i === index ? value : v));
            updateConfigField('http_headers', updated.filter(Boolean));
            return updated;
        });
    };

    // Render controlled rows for HTTP headers
    const controlledHttpHeaderRows = http_headers.map((value, i) => (
        <FormRows.Row index={i} key={i}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, marginRight: '8px', minWidth: 0 }}>
                    <Text
                        style={{ width: '100%', fontSize: '1.1em' }}
                        placeholder="Header: Value"
                        value={value}
                        onChange={(_, { value }) => handleHttpHeaderTextChange(value, { index: i })}
                    />
                </div>
                {i !== 0 && (
                    <Button
                        inline
                        appearance="secondary"
                        onClick={() => handleRemoveHttpHeader(i)}
                        label=""
                        icon={<TrashCanCross />}
                    />
                )}
            </div>
        </FormRows.Row>
    ));

    // Collect JSONPath values from all Text fields in rows
    const getPaths = () => jsonPathValues.filter(Boolean);
    // Function to clear all input fields
    const clearInputs = () => {
        setInputName('');
        setUrl('https://dummyjson.com/products');
        setCronExpression('0 * * * *');
        setSelectedIndex('');
        setMode('overwrite');
        setJsonPathValues([""]);
        setHttpHeaders([""]);
        setSeparateArrayPaths([]);
        props.onJSONPathsChange([]);
        props.setJsonPreview && props.setJsonPreview('')
    };

    const handleOnCreateIndex = async (createdIndexName: string) => {
        // Optimistically add the new index to the list immediately
        setIndexNames(prev => {
            if (prev.includes(createdIndexName)) return prev;
            return [...prev, createdIndexName].sort();
        });
        setSelectedIndex(createdIndexName);
        updateConfigField('selected_output_location', createdIndexName);

        // Refresh the list from the server in the background
        getAllIndexNames().then(names => {
            setIndexNames(names);
        });
    };

    return (
        <div>
            {/* Basic Configuration Section */}
            <Heading level={2} style={{ marginTop: '0', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
                Basic Configuration
            </Heading>
            
            <ControlGroup label="Input Name:" required>
                <Text
                    value={name}
                    onChange={(_, { value }) => {
                        updateConfigField('name', value);
                        setInputName(value)
                    }}
                    placeholder="Enter input name"
                    required
                    canClear
                />
            </ControlGroup>

            <ControlGroup label="API URL:" required>
                <Text
                    value={url}
                    onChange={(_, { value }) => {updateConfigField('url', value); setUrl(value)}}
                    disabled={props.loading}
                    canClear
                    required
                />
                <Button
                    type="submit"
                    disabled={props.loading}
                    onClick={() => props.fetchDataPreview(url, getPaths(), http_headers)}
                >
                    {props.loading ? <WaitSpinner size="medium" /> : "Fetch"}
                </Button>
            </ControlGroup>

            <ControlGroup label="HTTP Headers" tooltip="Add one or more HTTP headers in the format 'Header: Value'">
                <FormRows
                    onRequestAdd={handleNewHttpHeader}
                    addLabel="Add HTTP Header"
                >
                    {controlledHttpHeaderRows}
                </FormRows>
            </ControlGroup>

            {/* Splunk Configuration Section */}
            <Heading level={2} style={{ marginTop: '32px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
                Splunk Configuration
            </Heading>

            <ControlGroup label="Cron Expression:" required tooltip="Cron expression for scheduling data input">
                <Text
                    value={cronExpression}
                    onChange={(_, { value }) => {updateConfigField('cron_expression', value); setCronExpression(value)}}
                    placeholder="0 * * * *"
                    required
                />
            </ControlGroup>

            <ControlGroup label="Select Index:" required>
                <Select
                    value={selected_output_location}
                    onChange={(_, { value }) => {updateConfigField('selected_output_location', String(value)); setSelectedIndex(String(value))}}
                    filter
                    placeholder="Select an index..."
                    style={{ flex: 1, minWidth: '400px' }}
                >
                    {indexNames.map((indexName) => (
                        <Select.Option value={indexName} key={indexName} label={indexName} />
                    ))}
                </Select>
                <Button appearance="secondary" onClick={() => setShowCreateIndexModal(true)} elementRef={modalToggle}>
                    Create New Index
                </Button>
            </ControlGroup>
            <CreateNewIndex
                open={showCreateIndexModal}
                onClose={() => setShowCreateIndexModal(false)}
                onCreate={handleOnCreateIndex}
                modalToggle={modalToggle}
            />

            {/* Data Processing Section */}
            <Heading level={2} style={{ marginTop: '32px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
                Data Processing
            </Heading>

            <ControlGroup label="Exclude JSONPaths" tooltip="Provide one or more JSONPath expressions to exclude fields from the JSON.">
                <FormRows
                    onRequestAdd={handleNewJsonPathExclusion}
                    addLabel="Add Exclude JSONPath"
                >
                    {controlledJsonPathRows}
                </FormRows>
            </ControlGroup>

            <ControlGroup label="Separate Arrays as Events" tooltip="Select which arrays should be split into separate events. Each array item will become its own event in Splunk.">
                <div style={{ width: '100%' }}>
                    <ArrayFieldSelector
                        data={props.rawData}
                        selectedPaths={separateArrayPaths}
                        onSelectionChange={(paths) => {
                            setSeparateArrayPaths(paths);
                            updateConfigField('separate_array_paths', paths);
                        }}
                    />
                    {!!props.rawData && (
                        <Button
                            appearance="secondary"
                            onClick={() => setShowPreviewModal(true)}
                            elementRef={previewModalToggle}
                            style={{ marginTop: '12px' }}
                        >
                            Preview Events
                        </Button>
                    )}
                </div>
            </ControlGroup>

            <EventPreviewModal
                open={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                data={props.rawData}
                separateArrayPaths={separateArrayPaths}
                modalToggle={previewModalToggle}
            />

            <br />
            {/* assume if dataInputAppConfig is passed in save logic is being handled elsewhere (edit mode) */}
            {!props.dataInputAppConfig && (
                <Button
                    appearance="primary"
                    onClick={() => {
                        props.handleSave(
                            {
                                name,
                                input_type: dataInputType,
                                url,
                                http_headers,
                                excluded_json_paths: getPaths(),
                                enabled: true,
                                cron_expression: cronExpression,
                                selected_output_location: selected_output_location,
                                mode,
                                separate_array_paths: separateArrayPaths
                            } as DataInputAppConfig, clearInputs
                        );
                    }}
                >
                    Save Data Input
                </Button>
            )}
        </div>
    );
};

export default IndexDataForm;
