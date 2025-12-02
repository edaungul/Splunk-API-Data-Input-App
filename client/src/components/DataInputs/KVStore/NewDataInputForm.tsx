import React, { useMemo, useState } from "react";
import Message from '@splunk/react-ui/Message';

import { removeByJsonPaths } from '../../Json/utils';
import { addNewDataInputToKVStore } from "../../../utils/dataInputUtils";

import type { JSONElement } from "@splunk/react-ui/JSONTree";
import type { DataInputAppConfig } from "../../ManageDataInputs/DataInputs.types";
import KVStoreDataForm from "../../ManageDataInputs/KVStoreDataForm";


interface NewKVStoreDataInputFormProps {
  dataInputAppConfig?: DataInputAppConfig;
    setDataInputAppConfig?: React.Dispatch<React.SetStateAction<DataInputAppConfig>>;
  onDataFetched?: (data: string) => void;
  onSuccess?: () => void;
  onAddExcludePathRef?: (fn: (path: string) => void) => void;
}

const NewKVStoreDataInputForm: React.FC<NewKVStoreDataInputFormProps> = ({ dataInputAppConfig, setDataInputAppConfig, onDataFetched, onSuccess, onAddExcludePathRef }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Store the last fetched data so we can re-filter it when JSONPaths change
  const [rawData, setRawData] = useState<JSONElement | null>(null);
  const [filteredData, setFilteredData] = useState<JSONElement | null>({});

  const initialFields = useMemo(() => {
    if (filteredData && Object.keys(filteredData).length > 0) {
      return Object.keys(filteredData);
    } else if (rawData && Object.keys(rawData).length > 0) {
      return Object.keys(rawData);
    } else {
      return [];
    }
  }, [filteredData, rawData]);
  
  const onJSONPathsChange = (jsonPaths: string[]) => {
    if (!rawData) return;
    const filtered = jsonPaths.length ? removeByJsonPaths(rawData, jsonPaths) : rawData;
    setFilteredData(filtered);
    if (onDataFetched) onDataFetched(JSON.stringify(filtered));
  }

  async function fetchDataPreview(url: string, jsonPaths: string[]) {
    setError(null);
    setLoading(true);
    if (onDataFetched) onDataFetched('');

    try {
      if (!url) throw new Error("Please enter a URL");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setRawData(data as import('@splunk/react-ui/JSONTree').JSONElement); // Save the raw data for future filtering
      const filtered = jsonPaths.length ? removeByJsonPaths(data as import('@splunk/react-ui/JSONTree').JSONElement, jsonPaths) : data;
      if (onDataFetched) onDataFetched(JSON.stringify(filtered));
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Save Data Input handler
  const handleSaveDataInput = async (formData: DataInputAppConfig, clearInputs?: () => void) => {
    if (!formData.name || !formData.url || !formData.input_type || !formData.cron_expression || (formData.input_type === 'kvstore' && !formData.selected_output_location)) {
      setError("Not all required fields are filled out");
      return;
    }

    if (formData.input_type === 'kvstore') {
      try {
        await addNewDataInputToKVStore(formData);
        setError(null);
        if (onSuccess) onSuccess();
        if (clearInputs) clearInputs();
      } catch {
        setError('Failed to save data input to KV Store');
      }
    }
  };

  return (
    <>
      {error && (
        <Message style={{ marginBottom: "10px" }} appearance="fill" type="error">
          {error}
        </Message>
      )}
      <KVStoreDataForm dataInputAppConfig={dataInputAppConfig} setDataInputAppConfig={setDataInputAppConfig} fetchDataPreview={fetchDataPreview} setJsonPreview={onDataFetched} fieldsForKvStoreCreation={initialFields} loading={loading} handleSave={handleSaveDataInput} setError={setError} onJSONPathsChange={onJSONPathsChange} onAddExcludePathRef={onAddExcludePathRef} rawData={rawData} />
    </>
  );
};

export default NewKVStoreDataInputForm;
