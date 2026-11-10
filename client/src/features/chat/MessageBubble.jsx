import React from 'react';
import { Bot, User as UserIcon, RotateCcw } from 'lucide-react';

export function MessageBubble({ message, onCitationClick, isLastAssistant, onRegenerate, isStreaming }) {
  const isAssistant = message.role === 'assistant';

  // Render markdown text and bracketed citations [n]
  const renderFormattedContent = (content) => {
    if (!content) return null;

    // Split text into code blocks first
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    const blocks = content.split(codeBlockRegex);

    return blocks.map((block, blockIdx) => {
      if (block.startsWith('```') && block.endsWith('```')) {
        const lines = block.slice(3, -3).trim().split('\n');
        const lang = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const codeText = lang ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div
            key={blockIdx}
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #334155',
              borderRadius: '8px',
              margin: '10px 0',
              overflow: 'hidden',
            }}
          >
            {lang && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '4px 12px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  borderBottom: '1px solid #334155',
                }}
              >
                {lang}
              </div>
            )}
            <pre style={{ padding: '12px', margin: 0, overflowX: 'auto', fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Format inline citations [n]
      const parts = block.split(/(\[\d+\])/g);
      return (
        <span key={blockIdx}>
          {parts.map((part, index) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
              const citationNum = parseInt(match[1], 10);
              return (
                <button
                  key={index}
                  onClick={() => onCitationClick?.(citationNum)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#3b82f630',
                    color: '#60a5fa',
                    border: '1px solid #3b82f660',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    margin: '0 2px',
                    verticalAlign: 'baseline',
                    cursor: 'pointer',
                  }}
                >
                  [{citationNum}]
                </button>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: isAssistant ? '#1e293b50' : 'transparent',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isAssistant ? '#3b82f6' : '#475569',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {isAssistant ? <Bot size={18} /> : <UserIcon size={18} />}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
            {isAssistant ? 'Assistant' : 'You'}
          </p>

          {isAssistant && isLastAssistant && onRegenerate && !isStreaming && (
            <button
              onClick={() => onRegenerate(message.id || message._id)}
              title="Regenerate answer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              <RotateCcw size={12} /> Regenerate
            </button>
          )}
        </div>

        <div
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#f8fafc',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {renderFormattedContent(message.content)}
        </div>

        {isAssistant && message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>Sources:</span>
            {message.sources.map((src, i) => (
              <button
                key={i}
                onClick={() => onCitationClick?.(i + 1)}
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                }}
              >
                [{i + 1}] {src.filename}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
