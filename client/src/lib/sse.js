import { getAccessToken } from '../api/client.js';

async function processSSEResponse(response, callbacks = {}) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming not supported by browser response body');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const block of lines) {
      if (!block.trim()) continue;

      let eventType = 'message';
      let eventData = '';

      const rawLines = block.split('\n');
      for (const line of rawLines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6).trim();
        }
      }

      if (eventData) {
        try {
          const parsed = JSON.parse(eventData);
          if (eventType === 'meta' && callbacks.onMeta) callbacks.onMeta(parsed);
          else if (eventType === 'sources' && callbacks.onSources) callbacks.onSources(parsed.sources || []);
          else if (eventType === 'token' && callbacks.onToken) callbacks.onToken(parsed.text);
          else if (eventType === 'error' && callbacks.onError) callbacks.onError(parsed);
          else if (eventType === 'done' && callbacks.onDone) callbacks.onDone(parsed);
        } catch {
          // JSON parse failed for SSE data chunk
        }
      }
    }
  }
}

/**
 * Streams a new message request over SSE using fetch.
 */
export async function streamMessage(chatId, { content, documentIds }, callbacks = {}, signal) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/v1/chats/${chatId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, documentIds }),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || response.statusText || 'Failed to stream response');
  }

  return processSSEResponse(response, callbacks);
}

/**
 * Streams a message regeneration request over SSE using fetch.
 */
export async function regenerateMessageStream(chatId, messageId, callbacks = {}, signal) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/v1/chats/${chatId}/messages/${messageId}/regenerate`, {
    method: 'POST',
    headers,
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || response.statusText || 'Failed to regenerate response');
  }

  return processSSEResponse(response, callbacks);
}
