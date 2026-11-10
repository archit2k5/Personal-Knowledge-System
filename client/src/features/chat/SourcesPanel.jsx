import React from 'react';
import { X, FileText } from 'lucide-react';

export function SourcesPanel({ sources = [], selectedSource, onClose, onSelectSource }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderLeft: '1px solid #334155',
        width: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: '#3b82f6' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Citations & Sources</h3>
        </div>
        <button onClick={onClose} style={{ color: '#94a3b8' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sources.map((source, idx) => {
          const indexNum = source.index || idx + 1;
          const isSelected = selectedSource?.index === indexNum;

          return (
            <div
              key={idx}
              onClick={() => onSelectSource?.(source)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isSelected ? '#0f172a' : '#1e293b80',
                border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  [{indexNum}]
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.filename}
                </span>
              </div>

              {source.page && (
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Page {source.page}</p>
              )}

              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', wordBreak: 'break-word' }}>
                {source.snippet || source.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

