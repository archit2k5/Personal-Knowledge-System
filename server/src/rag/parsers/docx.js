/**
 * Parser for DOCX documents using mammoth.
 */
export async function parseDocx(buffer) {
  try {
    const mammoth = await import('mammoth');
    const result = await (mammoth.default || mammoth).extractRawText({ buffer });
    const content = (result.value || '').trim();

    if (!content) {
      throw new Error('No readable text could be extracted from the DOCX file');
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
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      // Fallback if mammoth package is not yet installed
      const rawText = buffer
        .toString('utf-8')
        .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!rawText || rawText.length < 20) {
        throw new Error('Unable to extract text from DOCX document');
      }

      return {
        pages: [{ pageNumber: 1, text: rawText }],
        fullText: rawText,
        pageCount: 1,
      };
    }
    throw error;
  }
}

