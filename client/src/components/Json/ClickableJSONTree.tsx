import React, { useState } from 'react';
import styled from 'styled-components';

interface ClickableJSONTreeProps {
    data: unknown;
    onPathClick?: (path: string) => void;
}

const TreeContainer = styled.div`
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
`;

const NodeRow = styled.div<{ $depth: number }>`
    padding-left: ${props => props.$depth * 16}px;
    display: flex;
    align-items: flex-start;
`;

const ExpandButton = styled.span`
    cursor: pointer;
    user-select: none;
    width: 16px;
    display: inline-block;
    color: #666;
    &:hover {
        color: #000;
    }
`;

const KeySpan = styled.span<{ $clickable: boolean }>`
    color: #881391;
    cursor: ${props => props.$clickable ? 'pointer' : 'default'};
    border-radius: 3px;
    padding: 0 2px;

    ${props => props.$clickable && `
        &:hover {
            background-color: #e8f4fc;
            text-decoration: underline;
        }
    `}
`;

const ValueSpan = styled.span<{ $type: string }>`
    color: ${props => {
        switch (props.$type) {
            case 'string': return '#c41a16';
            case 'number': return '#1c00cf';
            case 'boolean': return '#0d22aa';
            case 'null': return '#808080';
            default: return '#000';
        }
    }};
`;

const BracketSpan = styled.span`
    color: #000;
`;

const ArrayIndexSpan = styled.span<{ $clickable: boolean }>`
    color: #666;
    cursor: ${props => props.$clickable ? 'pointer' : 'default'};
    border-radius: 3px;
    padding: 0 2px;

    ${props => props.$clickable && `
        &:hover {
            background-color: #e8f4fc;
            text-decoration: underline;
        }
    `}
`;

const Tooltip = styled.div`
    position: fixed;
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    z-index: 1000;
    pointer-events: none;
`;

interface JSONNodeProps {
    keyName: string | number | null;
    value: unknown;
    path: string;
    depth: number;
    onPathClick?: (path: string) => void;
    isArrayItem?: boolean;
}

const JSONNode: React.FC<JSONNodeProps> = ({ keyName, value, path, depth, onPathClick, isArrayItem }) => {
    const [expanded, setExpanded] = useState(true);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    const isArray = Array.isArray(value);
    const hasChildren = isObject || isArray;

    const handleKeyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPathClick && path) {
            onPathClick(path);
        }
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (path && onPathClick) {
            setTooltip({
                x: e.clientX + 10,
                y: e.clientY + 10,
                text: `Click to exclude: ${path}`
            });
        }
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (tooltip) {
            setTooltip({
                ...tooltip,
                x: e.clientX + 10,
                y: e.clientY + 10
            });
        }
    };

    const renderValue = () => {
        if (value === null) {
            return <ValueSpan $type="null">null</ValueSpan>;
        }
        if (typeof value === 'string') {
            return <ValueSpan $type="string">"{value}"</ValueSpan>;
        }
        if (typeof value === 'number') {
            return <ValueSpan $type="number">{value}</ValueSpan>;
        }
        if (typeof value === 'boolean') {
            return <ValueSpan $type="boolean">{value.toString()}</ValueSpan>;
        }
        return null;
    };

    const renderKey = () => {
        if (keyName === null) return null;

        if (isArrayItem) {
            return (
                <ArrayIndexSpan
                    $clickable={!!onPathClick}
                    onClick={handleKeyClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                >
                    [{keyName}]
                </ArrayIndexSpan>
            );
        }

        return (
            <>
                <KeySpan
                    $clickable={!!onPathClick}
                    onClick={handleKeyClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                >
                    "{keyName}"
                </KeySpan>
                <span>: </span>
            </>
        );
    };

    if (!hasChildren) {
        return (
            <NodeRow $depth={depth}>
                <ExpandButton> </ExpandButton>
                {renderKey()}
                {renderValue()}
                {tooltip && (
                    <Tooltip style={{ left: tooltip.x, top: tooltip.y }}>
                        {tooltip.text}
                    </Tooltip>
                )}
            </NodeRow>
        );
    }

    const children = isArray ? (value as unknown[]) : Object.entries(value as Record<string, unknown>);
    const isEmpty = isArray ? (value as unknown[]).length === 0 : Object.keys(value as Record<string, unknown>).length === 0;

    return (
        <div>
            <NodeRow $depth={depth}>
                <ExpandButton onClick={() => setExpanded(!expanded)}>
                    {isEmpty ? ' ' : expanded ? '▼' : '▶'}
                </ExpandButton>
                {renderKey()}
                <BracketSpan>{isArray ? '[' : '{'}</BracketSpan>
                {!expanded && <BracketSpan>...</BracketSpan>}
                {(!expanded || isEmpty) && <BracketSpan>{isArray ? ']' : '}'}</BracketSpan>}
                {tooltip && (
                    <Tooltip style={{ left: tooltip.x, top: tooltip.y }}>
                        {tooltip.text}
                    </Tooltip>
                )}
            </NodeRow>
            {expanded && !isEmpty && (
                <>
                    {isArray
                        ? (children as unknown[]).map((item, index) => (
                            <JSONNode
                                key={index}
                                keyName={index}
                                value={item}
                                path={`${path}[${index}]`}
                                depth={depth + 1}
                                onPathClick={onPathClick}
                                isArrayItem
                            />
                        ))
                        : (children as [string, unknown][]).map(([key, val]) => (
                            <JSONNode
                                key={key}
                                keyName={key}
                                value={val}
                                path={path ? `${path}.${key}` : `$.${key}`}
                                depth={depth + 1}
                                onPathClick={onPathClick}
                            />
                        ))
                    }
                    <NodeRow $depth={depth}>
                        <ExpandButton> </ExpandButton>
                        <BracketSpan>{isArray ? ']' : '}'}</BracketSpan>
                    </NodeRow>
                </>
            )}
        </div>
    );
};

const ClickableJSONTree: React.FC<ClickableJSONTreeProps> = ({ data, onPathClick }) => {
    if (data === null || data === undefined) {
        return null;
    }

    const isArray = Array.isArray(data);
    const isObject = typeof data === 'object' && !isArray;

    if (!isArray && !isObject) {
        // Primitive value at root
        return (
            <TreeContainer>
                <JSONNode keyName={null} value={data} path="$" depth={0} onPathClick={onPathClick} />
            </TreeContainer>
        );
    }

    return (
        <TreeContainer>
            <JSONNode keyName={null} value={data} path="$" depth={0} onPathClick={onPathClick} />
        </TreeContainer>
    );
};

export default ClickableJSONTree;
