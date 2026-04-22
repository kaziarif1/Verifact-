import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError } from './errorHandler';

// ─── Ensure upload dir exists ─────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), '.tmp', 'verifact-uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const mediaFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(
      'Invalid file type. Only JPEG, PNG, WebP, GIF, MP4, MOV, WebM allowed.',
      400,
      'INVALID_FILE_TYPE'
    ));
  }
};

export const uploadMedia = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
});

export const uploadAvatar = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Avatar must be JPEG, PNG, or WebP.', 400, 'INVALID_AVATAR_TYPE'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
});
