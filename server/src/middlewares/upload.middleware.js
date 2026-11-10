import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const storage = multer.memoryStorage();

const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];

function fileFilter(_req, file, cb) {
  const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(
      ApiError.unsupportedMediaType(
        `Unsupported file extension "${ext}". Allowed: pdf, docx, txt, md`
      )
    );
  }
  cb(null, true);
}

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});

export function verifyMagicBytes(req, _res, next) {
  const files = req.files;
  if (!files || files.length === 0) {
    return next();
  }

  for (const file of files) {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    const buf = file.buffer;

    if (ext === '.pdf') {
      if (buf.length < 5 || buf.toString('utf8', 0, 5) !== '%PDF-') {
        return next(
          ApiError.badRequest(`File ${file.originalname} is not a valid PDF file`)
        );
      }
    } else if (ext === '.docx') {
      if (
        buf.length < 4 ||
        buf[0] !== 0x50 ||
        buf[1] !== 0x4b ||
        buf[2] !== 0x03 ||
        buf[3] !== 0x04
      ) {
        return next(
          ApiError.badRequest(`File ${file.originalname} is not a valid DOCX file`)
        );
      }
    }
  }

  next();
}

