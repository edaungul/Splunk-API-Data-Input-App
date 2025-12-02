import React, { useState } from "react";
import Message from '@splunk/react-ui/Message';

import { removeByJsonPaths } from '../../Json/utils';
import { addNewDataInputToIndex } from "../../../utils/dataInputUtils";

import type { JSONElement } from "@splunk/react-ui/JSONTree";
import type { DataInputAppConfig } from "../../ManageDataInputs/DataInputs.types";
import IndexDataForm from "../../ManageDataInputs/IndexDataForm";


interface NewIndexDataInputFormProps {
  dataInputAppConfig?: DataInputAppConfig;
  setDataInputAppConfig?: React.Dispatch<React.SetStateAction<DataInputAppConfig>>;
  onDataFetched?: (data: string) => void;
  onSuccess?: () => void;
  onAddExcludePathRef?: (fn: (path: string) => void) => void;
}

const NewIndexDataInputForm: React.FC<NewIndexDataInputFormProps> = ({ dataInputAppConfig, setDataInputAppConfig, onDataFetched, onSuccess, onAddExcludePathRef }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Store the last fetched data so we can re-filter it when JSONPaths change
  const [rawData, setRawData] = useState<JSONElement | null>(null);

  const onJSONPathsChange = (jsonPaths: string[]) => {
    if (!rawData) return;
    const filtered = jsonPaths.length ? removeByJsonPaths(rawData, jsonPaths) : rawData;
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
      setRawData(data as JSONElement); // Save the raw data for future filtering
      const filtered = jsonPaths.length ? removeByJsonPaths(data as JSONElement, jsonPaths) : data;
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
    if (!formData.name || !formData.url || !formData.input_type || !formData.cron_expression || !formData.selected_output_location) {
      setError("Not all required fields are filled out");
      return;
    }

    try {
      await addNewDataInputToIndex(formData);
      setError(null);
      if (onSuccess) onSuccess();
      if (clearInputs) clearInputs();
    } catch {
      setError('Failed to save data input configuration');
    }
  };

  return (
    <>
      {error && (
        <Message style={{ marginBottom: "10px" }} appearance="fill" type="error">
          {error}
        </Message>
      )}
      <IndexDataForm
        dataInputAppConfig={dataInputAppConfig}
        setDataInputAppConfig={setDataInputAppConfig}
        fetchDataPreview={fetchDataPreview}
        setJsonPreview={onDataFetched}
        loading={loading}
        handleSave={handleSaveDataInput}
        setError={setError}
        onJSONPathsChange={onJSONPathsChange}
        onAddExcludePathRef={onAddExcludePathRef}
        rawData={rawData}
      />
    </>
  );
};

export default NewIndexDataInputForm;
