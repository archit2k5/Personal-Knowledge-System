import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.js';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#1e293b', padding: '36px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
        {status === 'verifying' && (
          <div>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#3b82f620', color: '#3b82f6', marginBottom: '16px' }}>
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Verifying your email</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Please wait while we verify your token...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#10b98120', color: '#10b981', marginBottom: '16px' }}>
              <CheckCircle2 size={36} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Email verified!</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              Your email address has been verified successfully. You can now sign in to your account.
            </p>
            <Link
              to="/login"
              style={{ display: 'block', padding: '12px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '14px' }}
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#ef444420', color: '#ef4444', marginBottom: '16px' }}>
              <XCircle size={36} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Verification failed</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
            <Link
              to="/login"
              style={{ display: 'block', padding: '12px', borderRadius: '8px', backgroundColor: '#334155', color: '#fff', fontSize: '14px' }}
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

