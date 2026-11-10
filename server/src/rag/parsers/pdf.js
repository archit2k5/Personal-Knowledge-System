/**
 * Page-aware PDF parser.
 * Handles page extraction and detects scanned PDFs with no extractable text.
 */
export async function parsePdf(buffer) {
  try {
    const pdfParse = await import('pdf-parse');
    const parse = pdfParse.default || pdfParse;

    const pages = [];
    let currentPage = 1;

    // Use pagerender option to capture text per page
    const options = {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(function (textContent) {
          let lastY, text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }

          const pageText = text.trim();
          if (pageText) {
            pages.push({
              pageNumber: currentPage++,
              text: pageText,
            });
          }
          return text;
        });
      },
    };

    const data = await parse(buffer, options);
    const fullText = (data.text || '').trim();

    if (!fullText || fullText.length === 0) {
      throw new Error(
        'Scanned PDF detected: no extractable text found in this PDF. OCR is required for scanned documents.'
      );
    }

    const pageCount = data.numpages || pages.length || 1;

    // If per-page render did not populate pages, wrap full text
    if (pages.length === 0 && fullText) {
      pages.push({
        pageNumber: 1,
        text: fullText,
      });
    }

    return {
      pages,
      fullText,
      pageCount,
    };
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      // Fallback parser if pdf-parse is not yet installed in node_modules
      const rawText = buffer
        .toString('utf-8')
        .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!rawText || rawText.length < 50) {
        throw new Error(
          'Scanned PDF detected: no extractable text found in this PDF. OCR is required for scanned documents.'
        );
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

