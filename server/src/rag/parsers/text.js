/**
 * Parser for plain text and Markdown files.
 */
export async function parseText(buffer) {
  const content = buffer.toString('utf-8').trim();

  if (!content) {
    throw new Error('Document is empty');
  }

  return {
    pages: [
      {
        pageNumber: 1,
        text: content,
      },
    ],
    fullText: content,
    pageCount: 1,
  };
}

