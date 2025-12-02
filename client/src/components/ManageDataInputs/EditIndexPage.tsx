import { useState, useRef, useCallback } from 'react';
import ColumnLayout from '@splunk/react-ui/ColumnLayout';

import type { DataInputAppConfig } from './DataInputs.types';
import NewIndexDataInputForm from '../DataInputs/Index/NewIndexDataInputForm';
import JSONViewer from '../Json/JsonViewer';

interface EditIndexPageProps {
    dataInputAppConfig: DataInputAppConfig;
    setDataInputAppConfig: React.Dispatch<React.SetStateAction<DataInputAppConfig>>;
    onSuccess: () => void;
}

export default function EditIndexPage({ dataInputAppConfig, setDataInputAppConfig, onSuccess }: EditIndexPageProps) {
    const [jsonData, setJsonData] = useState<string>('');
    const addExcludePathRef = useRef<((path: string) => void) | null>(null);

    const handlePathClick = useCallback((path: string) => {
        if (addExcludePathRef.current) {
            addExcludePathRef.current(path);
        }
    }, []);

    return (
        <ColumnLayout gutter={100}>
            <ColumnLayout.Row>
                <ColumnLayout.Column span={6}>
                    <NewIndexDataInputForm
                        dataInputAppConfig={dataInputAppConfig}
                        setDataInputAppConfig={setDataInputAppConfig}
                        onDataFetched={(data: string) => {
                            setJsonData(data);
                        }}
                        onSuccess={onSuccess}
                        onAddExcludePathRef={(fn) => { addExcludePathRef.current = fn; }}
                    />
                </ColumnLayout.Column>
                <ColumnLayout.Column span={6}>
                    <JSONViewer initialData={jsonData} onPathClick={handlePathClick} />
                </ColumnLayout.Column>
            </ColumnLayout.Row>
        </ColumnLayout>
    );
}
