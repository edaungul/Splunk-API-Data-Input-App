import type { DataInputAppConfig } from "../components/ManageDataInputs/DataInputs.types";
import {
  addNewRecordToKVStore,
  deleteItemFromKVStore,
  readCollection,
  readItemFromKVStore,
  updateRecordInKVStore,
} from "./splunk";

/**
 * Adds a record to the 'api_input_connect_config' KV Store collection.
 * @param data The object to add to the collection.
 * @param options Optional fetch options (e.g., headers for auth).
 * @returns The response from Splunk as JSON.
 */
export async function addNewDataInputToKVStore(data: DataInputAppConfig) {
  return addNewRecordToKVStore(data, "api_input_connect_config");
}

export async function addNewDataInputToIndex(data: DataInputAppConfig) {
  // Index inputs are stored in the same config collection as KVStore inputs
  // The backend distinguishes them by input_type field
  return addNewRecordToKVStore(data, "api_input_connect_config");
}

export async function deleteConfigItemFromKVStore(key: string) {
  return deleteItemFromKVStore("api_input_connect_config", key);
}

export async function getDataInputsFromKVStore(): Promise<
  DataInputAppConfig[]
> {
  return readCollection("api_input_connect_config");
}

export async function getDataInputsConfigById(key: string): Promise<
  DataInputAppConfig
> {
  return await readItemFromKVStore("api_input_connect_config", key);
}

export async function updateDataInputConfigById(
  dataInputConfigItem: DataInputAppConfig)  {
    return await updateRecordInKVStore("api_input_connect_config", dataInputConfigItem);
  }

export function parseSelectedOutput(selectedOutputString: string): {
  app: string;
  collection: string;
} {
  const [app, collection] = selectedOutputString.split("/");
  return { app, collection };
}

export const getCollectionNameFromSelectedOutput = (
  selectedOutput: string
): string => {
  const { collection } = parseSelectedOutput(selectedOutput);
  return collection;
};

export const generateSelectedOutputString = (
  app: string,
  collection: string
): string => {
  return `${app}/${collection}`;
};

export const fetchDataInputsData = async (
  setState: React.Dispatch<React.SetStateAction<DataInputAppConfig[]>>
) => {
  const result = await getDataInputsFromKVStore();
  if (Array.isArray(result)) {
    setState(result);
  } else if (result && typeof result === "object") {
    setState([result]);
  } else {
    setState([]);
  }
};
