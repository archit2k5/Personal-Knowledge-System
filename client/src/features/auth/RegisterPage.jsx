import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.js';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register({ name, email, password });
      navigate(`/check-inbox?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Create an account</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Get started with Personal Knowledge Chat</p>

        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', border: '1px solid #ef444450' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Password (min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '14px', color: '#94a3b8', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

