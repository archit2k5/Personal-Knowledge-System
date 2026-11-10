import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.js';
import { Mail, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Intentionally silent to prevent account enumeration
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Reset password</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Enter your email and we'll send you a password reset link.
        </p>

        {submitted ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b98120', color: '#10b981', padding: '14px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
              <CheckCircle2 size={18} />
              If an account with that email exists, we've sent instructions to reset your password.
            </div>
            <Link
              to="/login"
              style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', backgroundColor: '#334155', color: '#fff', fontSize: '14px' }}
            >
              Back to login
            </Link>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={submitting}
              style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <Link to="/login" style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

