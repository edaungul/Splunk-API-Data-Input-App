import React, { useMemo } from 'react';
import Switch from '@splunk/react-ui/Switch';
import styled from 'styled-components';
import { detectArraysInJson, type DetectedArray } from './arrayUtils';

interface ArrayFieldSelectorProps {
    data: unknown;
    selectedPaths: string[];
    onSelectionChange: (paths: string[]) => void;
}

const Container = styled.div`
    margin-top: 8px;
`;

const ArrayItem = styled.div`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    margin: 4px 0;
    background: #f5f5f5;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 13px;

    &:hover {
        background: #eee;
    }
`;

const PathInfo = styled.div`
    flex: 1;
    margin-left: 12px;
`;

const PathName = styled.span`
    color: #881391;
    font-weight: 500;
`;

const ArrayLength = styled.span`
    color: #666;
    margin-left: 8px;
    font-size: 12px;
`;

const NoArraysMessage = styled.p`
    color: #666;
    font-style: italic;
    font-size: 13px;
    margin: 8px 0;
`;

const ArrayFieldSelector: React.FC<ArrayFieldSelectorProps> = ({
    data,
    selectedPaths,
    onSelectionChange
}) => {
    const detectedArrays: DetectedArray[] = useMemo(() => {
        if (!data) return [];
        return detectArraysInJson(data);
    }, [data]);

    const handleToggle = (path: string) => {
        const isCurrentlySelected = selectedPaths.includes(path);
        if (isCurrentlySelected) {
            onSelectionChange(selectedPaths.filter(p => p !== path));
        } else {
            onSelectionChange([...selectedPaths, path]);
        }
    };

    if (!data) {
        return null;
    }

    if (detectedArrays.length === 0) {
        return (
            <Container>
                <NoArraysMessage>No arrays detected in the response</NoArraysMessage>
            </Container>
        );
    }

    return (
        <Container>
            {detectedArrays.map((arr) => (
                <ArrayItem key={arr.path}>
                    <Switch
                        selected={selectedPaths.includes(arr.path)}
                        onClick={() => handleToggle(arr.path)}
                        appearance="toggle"
                    />
                    <PathInfo>
                        <PathName>{arr.path}</PathName>
                        <ArrayLength>({arr.length} items)</ArrayLength>
                    </PathInfo>
                </ArrayItem>
            ))}
        </Container>
    );
};

export default ArrayFieldSelector;
