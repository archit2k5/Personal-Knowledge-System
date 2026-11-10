export function chunkText(fullText, options = {}) {
  const chunkSize = options.chunkSize || 1000;
  const overlap = options.overlap || 150;
  const page = options.page;

  if (!fullText || fullText.trim().length === 0) {
    return [];
  }

  const paragraphs = fullText.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length <= chunkSize) {
      currentChunk += (currentChunk.length ? '\n\n' : '') + trimmed;
    } else {
      if (currentChunk.length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: currentChunk,
          page,
        });

        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
        currentChunk = overlapWords + '\n\n' + trimmed;
      } else {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: trimmed.slice(0, chunkSize),
          page,
        });
        currentChunk = trimmed.slice(chunkSize - overlap);
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      text: currentChunk.trim(),
      page,
    });
  }

  return chunks;
}

