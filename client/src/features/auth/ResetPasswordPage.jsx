import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.js';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      navigate('/login?reset=success');
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Create new password</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Enter a new, strong password for your account.
        </p>

        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', border: '1px solid #ef444450' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>

          <Link to="/login" style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
            Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}

