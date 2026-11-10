import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';
import { UploadCloud } from 'lucide-react';

export function MessageList({ messages = [], isStreaming, onCitationClick, onOpenUpload, onRegenerate }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: '#3b82f615',
            color: '#3b82f6',
            marginBottom: '16px',
          }}
        >
          <UploadCloud size={40} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          Start your research
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '440px', marginBottom: '20px', lineHeight: '1.5' }}>
          Upload PDFs, Word docs, Markdown, or text files to this chat. Answers will be isolated and grounded exclusively in this chat's documents.
        </p>
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            style={{
              padding: '10px 18px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Upload Documents
          </button>
        )}
      </div>
    );
  }

  // Find the index of the last assistant message
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {messages.map((message, idx) => (
        <MessageBubble
          key={message.id || message._id || idx}
          message={message}
          onCitationClick={onCitationClick}
          isLastAssistant={idx === lastAssistantIndex}
          onRegenerate={onRegenerate}
          isStreaming={isStreaming}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
