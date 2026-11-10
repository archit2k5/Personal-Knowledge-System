import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../../api/messages.js';
import { documentsApi } from '../../api/documents.js';
import { chatsApi } from '../../api/chats.js';
import { streamMessage, regenerateMessageStream } from '../../lib/sse.js';
import { MessageList } from './MessageList.jsx';
import { Composer } from './Composer.jsx';
import { SourcesPanel } from './SourcesPanel.jsx';
import { UploadDropzone } from '../documents/UploadDropzone.jsx';
import { DocumentList } from '../documents/DocumentList.jsx';
import { Files, BookOpen, Sliders, X } from 'lucide-react';

export function ChatView() {
  const { chatId } = useParams();
  const queryClient = useQueryClient();

  const [activeSources, setActiveSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Per-chat settings state
  const [topK, setTopK] = useState(6);
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState('llama-3.3-70b-versatile');

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortControllerRef = useRef(null);

  // Load chat details
  const { data: chatData } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const data = await chatsApi.getChat(chatId);
      if (data?.chat?.settings) {
        setTopK(data.chat.settings.topK ?? 6);
        setTemperature(data.chat.settings.temperature ?? 0.7);
        if (data.chat.settings.model) setModel(data.chat.settings.model);
      }
      return data;
    },
    enabled: !!chatId,
  });

  // Load messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => messagesApi.listMessages(chatId),
    enabled: !!chatId,
  });

  // Load documents
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['documents', chatId],
    queryFn: () => documentsApi.listDocuments(chatId),
    enabled: !!chatId,
    refetchInterval: 4000,
  });

  const updateChatSettingsMutation = useMutation({
    mutationFn: (settings) => chatsApi.updateChat(chatId, { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      setShowSettingsModal(false);
    },
  });

  const uploadDocumentsMutation = useMutation({
    mutationFn: (files) => documentsApi.uploadDocuments(chatId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', chatId] });
      refetchDocuments();
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => documentsApi.deleteDocument(chatId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', chatId] });
    },
  });

  const reprocessDocumentMutation = useMutation({
    mutationFn: (docId) => documentsApi.reprocessDocument(chatId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', chatId] });
    },
  });

  const messages = [...(messagesData?.items || [])];

  if (isStreaming && streamedContent) {
    messages.push({
      _id: 'temp-streaming',
      role: 'assistant',
      content: streamedContent,
      sources: activeSources,
    });
  }

  const handleSendMessage = async (content) => {
    setIsStreaming(true);
    setStreamedContent('');
    setActiveSources([]);

    abortControllerRef.current = new AbortController();

    // Optimistically push user message into cache
    queryClient.setQueryData(['messages', chatId], (old) => {
      const items = old?.items || [];
      return {
        ...old,
        items: [
          ...items,
          {
            _id: `temp-${Date.now()}`,
            role: 'user',
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    try {
      await streamMessage(
        chatId,
        { content },
        {
          onMeta: () => {},
          onSources: (sources) => {
            setActiveSources(sources);
            if (sources.length > 0) {
              setShowSourcesPanel(true);
            }
          },
          onToken: (token) => {
            setStreamedContent((prev) => prev + token);
          },
          onError: (err) => {
            console.error('SSE Error', err);
          },
          onDone: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            setIsStreaming(false);
          },
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to stream message', err);
      }
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  };

  const handleRegenerate = async (messageId) => {
    setIsStreaming(true);
    setStreamedContent('');
    setActiveSources([]);

    abortControllerRef.current = new AbortController();

    try {
      await regenerateMessageStream(
        chatId,
        messageId,
        {
          onSources: (sources) => {
            setActiveSources(sources);
            if (sources.length > 0) setShowSourcesPanel(true);
          },
          onToken: (token) => {
            setStreamedContent((prev) => prev + token);
          },
          onError: (err) => {
            console.error('SSE Error', err);
          },
          onDone: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            setIsStreaming(false);
          },
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to regenerate response', err);
      }
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  };

  const handleCitationClick = (citationIndex) => {
    const found = activeSources.find((s) => s.index === citationIndex);
    setSelectedSource(found || null);
    setShowSourcesPanel(true);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateChatSettingsMutation.mutate({
      topK: Number(topK),
      temperature: Number(temperature),
      model,
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Central Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top bar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            backgroundColor: '#0f172a',
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
              {chatData?.chat?.title || 'Chat'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Chat Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                border: '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              <Sliders size={16} /> Settings
            </button>

            <button
              onClick={() => setShowSourcesPanel((prev) => !prev)}
              title="Toggle Sources"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: showSourcesPanel ? '#334155' : 'transparent',
                color: showSourcesPanel ? '#fff' : '#94a3b8',
                fontSize: '13px',
                border: '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              <BookOpen size={16} /> Sources
            </button>

            <button
              onClick={() => setShowDocsPanel((prev) => !prev)}
              title="Toggle Documents Drawer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: showDocsPanel ? '#334155' : 'transparent',
                color: showDocsPanel ? '#fff' : '#94a3b8',
                fontSize: '13px',
                border: '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              <Files size={16} /> Documents ({documentsData?.items?.length || 0})
            </button>
          </div>
        </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onCitationClick={handleCitationClick}
          onOpenUpload={() => setShowDocsPanel(true)}
          onRegenerate={handleRegenerate}
        />

        {/* Input composer */}
        <Composer
          onSend={handleSendMessage}
          onStop={handleStopStream}
          isStreaming={isStreaming}
          disabled={messagesLoading}
        />
      </div>

      {/* Sources panel */}
      {showSourcesPanel && (
        <SourcesPanel
          sources={activeSources}
          selectedSource={selectedSource}
          onClose={() => setShowSourcesPanel(false)}
          onSelectSource={setSelectedSource}
        />
      )}

      {/* Right Drawer: Documents for this chat */}
      {showDocsPanel && (
        <aside
          style={{
            width: '320px',
            backgroundColor: '#090d16',
            borderLeft: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Chat Documents</h3>
            <button onClick={() => setShowDocsPanel(false)} style={{ color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
              Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <UploadDropzone
              onUpload={(files) => uploadDocumentsMutation.mutate(files)}
              isUploading={uploadDocumentsMutation.isPending}
            />

            <DocumentList
              documents={documentsData?.items || []}
              chatId={chatId}
              onDeleteDocument={(id) => deleteDocumentMutation.mutate(id)}
              onReprocess={(id) => reprocessDocumentMutation.mutate(id)}
            />
          </div>
        </aside>
      )}

      {/* Chat Settings Modal */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#00000080',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>Chat Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast)</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  <span>Top-K Chunks</span>
                  <span>{topK}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  <span>Temperature</span>
                  <span>{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #334155', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateChatSettingsMutation.isPending}
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
