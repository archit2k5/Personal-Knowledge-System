import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.js';
import { Mail, CheckCircle2 } from 'lucide-react';

export function CheckInboxPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const isUnverified = searchParams.get('unverified') === 'true';

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setSentNotice(true);
      setCooldown(60);
    } catch {
      // Ignore or show message
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#1e293b', padding: '36px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: '#3b82f620', color: '#3b82f6', marginBottom: '20px' }}>
          <Mail size={36} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>
          {isUnverified ? 'Verify your email to continue' : 'Check your inbox'}
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
          We've sent a verification link to <strong style={{ color: '#fff' }}>{email || 'your email'}</strong>. Please click the link inside to activate your account.
        </p>

        {sentNotice && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b98120', color: '#10b981', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>
            <CheckCircle2 size={16} /> Verification email resent!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: cooldown > 0 ? '#334155' : '#3b82f6',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {resending ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </button>

          <Link
            to="/login"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', color: '#cbd5e1', fontSize: '14px' }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

