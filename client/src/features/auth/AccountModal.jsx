import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/auth.js';
import { X, Check, AlertCircle } from 'lucide-react';

export function AccountModal({ onClose }) {
  const { user, setUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess(false);

    if (!name.trim()) {
      setNameError('Name cannot be empty');
      return;
    }

    setSavingName(true);
    try {
      const data = await authApi.updateMe(name.trim());
      setUser(data.user);
      setNameSuccess(true);
    } catch (err) {
      setNameError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match');
      return;
    }

    setSavingPass(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // After changing password, sessions are revoked
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
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
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>Account Settings</h2>
          <button onClick={onClose} style={{ color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Update Profile Name */}
        <form onSubmit={handleUpdateName} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Profile Information</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
            />
          </div>

          {nameSuccess && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', marginBottom: '8px' }}>
              <Check size={14} /> Name updated successfully
            </p>
          )}

          {nameError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
              <AlertCircle size={14} /> {nameError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingName}
            style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {savingName ? 'Saving...' : 'Save Name'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Change Password</h3>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>New Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
            />
          </div>

          {passSuccess && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', marginBottom: '8px' }}>
              <Check size={14} /> Password updated! Logging out of sessions...
            </p>
          )}

          {passError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
              <AlertCircle size={14} /> {passError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPass}
            style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {savingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

