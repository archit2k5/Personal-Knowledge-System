import { parseText } from './text.js';
import { parseDocx } from './docx.js';
import { parsePdf } from './pdf.js';

export async function parseDocument(buffer, filename) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdf(buffer);
    case '.docx':
      return parseDocx(buffer);
    case '.txt':
    case '.md':
      return parseText(buffer);
    default:
      throw new Error(`Unsupported document extension "${ext}"`);
  }
}

