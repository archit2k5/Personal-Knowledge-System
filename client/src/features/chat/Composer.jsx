import React, { useState } from 'react';
import { Send, Square } from 'lucide-react';

export function Composer({ onSend, onStop, isStreaming, disabled }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || isStreaming || disabled) return;
    onSend(content.trim());
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1px solid #334155',
        }}
      >
        <textarea
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming || disabled}
          placeholder={isStreaming ? 'Assistant is answering...' : 'Ask a question about your documents...'}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '14px',
            resize: 'none',
            maxHeight: '120px',
            padding: '4px 0',
            lineHeight: '1.5',
          }}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop generation"
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: '#ef4444',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!content.trim() || disabled}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: content.trim() ? '#3b82f6' : '#334155',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: content.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={16} />
          </button>
        )}
      </form>
    </div>
  );
}

