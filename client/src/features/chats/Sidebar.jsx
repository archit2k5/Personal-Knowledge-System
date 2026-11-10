import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '../../api/chats.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Plus, MessageSquare, Trash2, Edit2, LogOut, Check, X, User } from 'lucide-react';
import { AccountModal } from '../auth/AccountModal.jsx';

export function Sidebar() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.listChats({ limit: 50 }),
  });

  const createChatMutation = useMutation({
    mutationFn: () => chatsApi.createChat('New chat'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      navigate(`/chats/${data.chat.id || data.chat._id}`);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id) => chatsApi.deleteChat(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      if (chatId === deletedId) {
        navigate('/chats');
      }
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, title }) => chatsApi.updateChat(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setEditingId(null);
    },
  });

  const chats = data?.items || [];

  const handleStartEdit = (chat, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(chat.id || chat._id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      updateChatMutation.mutate({ id, title: editTitle.trim() });
    } else {
      setEditingId(null);
    }
  };

  return (
    <aside style={{ width: '260px', backgroundColor: '#090d16', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      {/* Header & New Chat button */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
        <button
          onClick={() => createChatMutation.mutate()}
          disabled={createChatMutation.isPending}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <Plus size={18} /> New Chat
        </button>
      </div>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isLoading ? (
          <p style={{ color: '#64748b', fontSize: '13px', padding: '12px', textAlign: 'center' }}>Loading chats...</p>
        ) : chats.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No chats yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {chats.map((c) => {
              const id = c.id || c._id;
              const isActive = chatId === id;
              const isEditing = editingId === id;

              return (
                <div
                  key={id}
                  style={{
                    position: 'relative',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#1e293b' : 'transparent',
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '8px', gap: '6px' }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        style={{
                          flex: 1,
                          backgroundColor: '#0f172a',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '13px',
                          padding: '4px 6px',
                        }}
                      />
                      <button onClick={(e) => handleSaveEdit(id, e)} style={{ color: '#10b981' }}>
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ color: '#94a3b8' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/chats/${id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        fontSize: '13px',
                        color: isActive ? '#fff' : '#cbd5e1',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        <MessageSquare size={16} style={{ flexShrink: 0, color: '#94a3b8' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={(e) => handleStartEdit(c, e)}
                          title="Rename"
                          style={{ color: '#94a3b8', padding: '4px', opacity: isActive ? 1 : 0.6 }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm('Delete this chat and its documents?')) {
                              deleteChatMutation.mutate(id);
                            }
                          }}
                          title="Delete"
                          style={{ color: '#ef4444', padding: '4px', opacity: isActive ? 1 : 0.6 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User profile / Logout footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={() => setShowAccountModal(true)}
          style={{ overflow: 'hidden', cursor: 'pointer', flex: 1, paddingRight: '8px' }}
          title="Account Settings"
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name || 'User'}
          </p>
          <p style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowAccountModal(true)}
            title="Account Settings"
            style={{ color: '#94a3b8', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <User size={16} />
          </button>
          <button
            onClick={logout}
            title="Sign Out"
            style={{ color: '#94a3b8', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
    </aside>
  );
}
