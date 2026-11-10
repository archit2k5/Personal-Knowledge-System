import React from 'react';
import { FileText, Download, Trash2, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { documentsApi } from '../../api/documents.js';

export function DocumentList({ documents = [], chatId, onDeleteDocument, onReprocess }) {
  const handleDownload = async (docId, originalName) => {
    try {
      const { url } = await documentsApi.getFileDownloadUrl(chatId, docId);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message || 'Could not generate download link');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#10b98120', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Ready
          </span>
        );
      case 'processing':
      case 'uploaded':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f59e0b20', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            <Clock size={12} className="animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            <AlertTriangle size={12} /> Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (documents.length === 0) {
    return (
      <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
        No documents attached to this chat yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {documents.map((doc) => {
        const id = doc.id || doc._id;

        return (
          <div
            key={id}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <FileText size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.originalName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => handleDownload(id, doc.originalName)}
                  title="Download file"
                  style={{ color: '#94a3b8', padding: '4px' }}
                >
                  <Download size={14} />
                </button>
                {doc.status === 'failed' && onReprocess && (
                  <button
                    onClick={() => onReprocess(id)}
                    title="Reprocess file"
                    style={{ color: '#f59e0b', padding: '4px' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${doc.originalName}"?`)) {
                      onDeleteDocument(id);
                    }
                  }}
                  title="Delete file"
                  style={{ color: '#ef4444', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
              <span>{(doc.sizeBytes / 1024).toFixed(1)} KB {doc.chunkCount ? `• ${doc.chunkCount} chunks` : ''}</span>
              {renderStatusBadge(doc.status)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

