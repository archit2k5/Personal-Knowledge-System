export function setupSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

export function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createSSEWriter(res) {
  setupSSEHeaders(res);

  return {
    sendMeta: (meta) => sendSSEEvent(res, 'meta', meta),
    sendSources: (sources) => sendSSEEvent(res, 'sources', { sources }),
    sendToken: (text) => sendSSEEvent(res, 'token', { text }),
    sendError: (error) => sendSSEEvent(res, 'error', error),
    sendDone: (done) => sendSSEEvent(res, 'done', done),
    close: () => res.end(),
  };
}

