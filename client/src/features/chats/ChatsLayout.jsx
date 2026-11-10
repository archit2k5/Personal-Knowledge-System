import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { MessageSquarePlus } from 'lucide-react';

export function ChatsLayout() {
  const { chatId } = useParams();

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      {chatId ? (
        <Outlet />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: '#1e293b', marginBottom: '16px' }}>
            <MessageSquarePlus size={36} style={{ color: '#3b82f6' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
            Select or start a chat
          </h2>
          <p style={{ fontSize: '14px', maxWidth: '380px' }}>
            Each chat has its own private context and document library. Pick a chat from the sidebar or click "New Chat".
          </p>
        </div>
      )}
    </div>
  );
}

