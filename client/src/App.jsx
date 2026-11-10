import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { CheckInboxPage } from './features/auth/CheckInboxPage.jsx';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage.jsx';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage.jsx';
import { ChatsLayout } from './features/chats/ChatsLayout.jsx';
import { ChatView } from './features/chat/ChatView.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/check-inbox" element={<CheckInboxPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/chats" element={<ChatsLayout />}>
                <Route path=":chatId" element={<ChatView />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

