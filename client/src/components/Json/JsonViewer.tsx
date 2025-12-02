import { useMemo } from 'react';
import Message from '@splunk/react-ui/Message';
import Heading from '@splunk/react-ui/Heading';
import ClickableJSONTree from './ClickableJSONTree';

interface JSONViewerProps {
    initialData: string;
    onPathClick?: (path: string) => void;
}

export default function JSONViewer({ initialData, onPathClick }: JSONViewerProps) {
    const { parsedJSON, isValidJSON } = useMemo(() => {
        if (!initialData) return { parsedJSON: null, isValidJSON: true };
        try {
            const parsed = JSON.parse(initialData);
            return { parsedJSON: parsed, isValidJSON: true };
        } catch {
            return { parsedJSON: null, isValidJSON: false };
        }
    }, [initialData]);

    const JSONTreeMemo = useMemo(() => {
        return parsedJSON ? (
            <ClickableJSONTree data={parsedJSON} onPathClick={onPathClick} />
        ) : (
            <Message type="info">Fetch data to see preview. Click on any key to add it to exclusions.</Message>
        );
    }, [parsedJSON, onPathClick]);

    return (
        <div>
            <Heading level={2}>Preview</Heading>
            {onPathClick && (
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Click on any key to add it to the exclude list
                </p>
            )}
            {isValidJSON ? (
                JSONTreeMemo
            ) : (
                <p color="error" style={{ marginTop: 1, textAlign: 'center' }}>
                    Invalid JSON data provided.
                </p>
            )}
        </div>
    );
}
