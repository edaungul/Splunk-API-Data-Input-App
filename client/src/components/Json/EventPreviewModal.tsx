import React, { useMemo, useState } from 'react';
import Modal from '@splunk/react-ui/Modal';
import Button from '@splunk/react-ui/Button';
import TabBar from '@splunk/react-ui/TabBar';
import styled from 'styled-components';
import { generateSeparateEvents } from './arrayUtils';

interface EventPreviewModalProps {
    open: boolean;
    onClose: () => void;
    data: unknown;
    separateArrayPaths: string[];
    modalToggle: React.RefObject<HTMLButtonElement | null>;
}

const PreviewContainer = styled.div`
    max-height: 500px;
    overflow-y: auto;
`;

const EventCard = styled.div`
    background: #1e1e1e;
    border-radius: 4px;
    margin: 8px 0;
    overflow: hidden;
`;

const EventHeader = styled.div`
    background: #2d2d2d;
    padding: 8px 12px;
    font-size: 12px;
    color: #888;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const EventNumber = styled.span`
    color: #4fc3f7;
    font-weight: 500;
`;

const SourceBadge = styled.span`
    background: #3d5afe;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
`;

const EventBody = styled.pre`
    margin: 0;
    padding: 12px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 12px;
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-all;
`;

const SummaryBar = styled.div`
    background: #e3f2fd;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const SummaryText = styled.span`
    font-size: 14px;
    color: #1565c0;
`;

const SummaryCount = styled.span`
    font-size: 24px;
    font-weight: 600;
    color: #1565c0;
`;

const NoSelectionMessage = styled.div`
    text-align: center;
    padding: 40px;
    color: #666;
`;

const PaginationBar = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
`;

const PageInfo = styled.span`
    color: #666;
    font-size: 14px;
`;

const EventPreviewModal: React.FC<EventPreviewModalProps> = ({
    open,
    onClose,
    data,
    separateArrayPaths,
    modalToggle
}) => {
    const [activeTab, setActiveTab] = useState<'separated' | 'original'>('separated');
    const [currentPage, setCurrentPage] = useState(0);
    const eventsPerPage = 10;

    const separatedEvents = useMemo(() => {
        if (!data) return [];
        return generateSeparateEvents(data, separateArrayPaths);
    }, [data, separateArrayPaths]);

    const totalPages = Math.ceil(separatedEvents.length / eventsPerPage);
    const paginatedEvents = separatedEvents.slice(
        currentPage * eventsPerPage,
        (currentPage + 1) * eventsPerPage
    );

    const handleTabChange = (_: React.SyntheticEvent, { selectedTabId }: { selectedTabId?: string }) => {
        if (selectedTabId) {
            setActiveTab(selectedTabId as 'separated' | 'original');
            setCurrentPage(0);
        }
    };

    const renderEvent = (event: unknown, _index: number, globalIndex: number) => {
        const eventObj = event as Record<string, unknown>;
        const sourceArray = eventObj._source_array as string | undefined;

        return (
            <EventCard key={globalIndex}>
                <EventHeader>
                    <EventNumber>Event #{globalIndex + 1}</EventNumber>
                    {sourceArray && <SourceBadge>from: {sourceArray}</SourceBadge>}
                </EventHeader>
                <EventBody>{JSON.stringify(event, null, 2)}</EventBody>
            </EventCard>
        );
    };

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            returnFocus={modalToggle}
            style={{ width: '800px' }}
        >
            <Modal.Header title="Event Preview - How data will appear in Splunk" />
            <Modal.Body>
                <TabBar activeTabId={activeTab} onChange={handleTabChange}>
                    <TabBar.Tab
                        label={`Separated Events (${separatedEvents.length})`}
                        tabId="separated"
                    />
                    <TabBar.Tab
                        label="Original (1 event)"
                        tabId="original"
                    />
                </TabBar>

                <PreviewContainer>
                    {activeTab === 'separated' ? (
                        <>
                            <SummaryBar>
                                <SummaryText>
                                    {separateArrayPaths.length > 0
                                        ? `Arrays being separated: ${separateArrayPaths.join(', ')}`
                                        : 'No arrays selected for separation'
                                    }
                                </SummaryText>
                                <div>
                                    <SummaryCount>{separatedEvents.length}</SummaryCount>
                                    <SummaryText> events</SummaryText>
                                </div>
                            </SummaryBar>

                            {separateArrayPaths.length === 0 ? (
                                <NoSelectionMessage>
                                    <p>Select arrays above to see how they will be separated into individual events.</p>
                                    <p>Each array item will become a separate Splunk event.</p>
                                </NoSelectionMessage>
                            ) : (
                                <>
                                    {paginatedEvents.map((event, idx) =>
                                        renderEvent(event, idx, currentPage * eventsPerPage + idx)
                                    )}

                                    {totalPages > 1 && (
                                        <PaginationBar>
                                            <Button
                                                appearance="secondary"
                                                disabled={currentPage === 0}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                            >
                                                Previous
                                            </Button>
                                            <PageInfo>
                                                Page {currentPage + 1} of {totalPages}
                                            </PageInfo>
                                            <Button
                                                appearance="secondary"
                                                disabled={currentPage >= totalPages - 1}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                            >
                                                Next
                                            </Button>
                                        </PaginationBar>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <SummaryBar>
                                <SummaryText>Original response as single event</SummaryText>
                                <div>
                                    <SummaryCount>1</SummaryCount>
                                    <SummaryText> event</SummaryText>
                                </div>
                            </SummaryBar>
                            <EventCard>
                                <EventHeader>
                                    <EventNumber>Event #1</EventNumber>
                                </EventHeader>
                                <EventBody>{JSON.stringify(data, null, 2)}</EventBody>
                            </EventCard>
                        </>
                    )}
                </PreviewContainer>
            </Modal.Body>
            <Modal.Footer>
                <Button appearance="secondary" onClick={onClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EventPreviewModal;
