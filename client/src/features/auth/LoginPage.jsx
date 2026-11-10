import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/chats');
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        navigate(`/check-inbox?email=${encodeURIComponent(email)}&unverified=true`);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Welcome back</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Sign in to Personal Knowledge Chat</p>

        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', border: '1px solid #ef444450' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: '#3b82f6' }}>Forgot password?</Link>
            </div>
            <input
              type="password"
              required
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
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '14px', color: '#94a3b8', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#3b82f6', fontWeight: 500 }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}

