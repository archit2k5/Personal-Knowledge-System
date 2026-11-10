import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

export function UploadDropzone({ onUpload, isUploading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    setError('');
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      setError('You can upload up to 5 files at a time.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const validFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(ext)) {
        setError(`"${file.name}" has an unsupported format. Allowed: PDF, DOCX, TXT, MD.`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 20MB size limit.`);
        return;
      }

      validFiles.push(file);
    }

    onUpload(validFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragOver ? '2px dashed #3b82f6' : '2px dashed #334155',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: isDragOver ? '#3b82f610' : '#0f172a50',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', backgroundColor: '#3b82f620', color: '#3b82f6', marginBottom: '8px' }}>
          <UploadCloud size={24} />
        </div>

        <p style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '2px' }}>
          {isUploading ? 'Uploading files...' : 'Upload files for this chat'}
        </p>
        <p style={{ fontSize: '11px', color: '#94a3b8' }}>
          PDF, DOCX, TXT, MD (max 20MB, up to 5 files)
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

