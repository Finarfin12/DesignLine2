import multer from 'multer';
import { uploadFile, generateFilename } from '../services/storageService';
import { env } from '../config/env';

const storage = multer.memoryStorage();

const allowedMimetypes = [
  // Images
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/tiff', 'image/bmp', 'image/x-icon', 'image/vnd.adobe.photoshop',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/rtf', 'application/json',
  // Design files
  'application/postscript', 'application/illustrator', 'application/x-indesign',
  'application/vnd.corel.draw', 'image/x-eps',
  // Fonts
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip',
  // Video / Audio
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg',
  // Catch-all binary
  'application/octet-stream',
];

export const createUpload = (category: string) => {
  return multer({
    storage,
    limits: {
      fileSize: env.upload.maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (allowedMimetypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}`));
      }
    },
  });
};

export const processUpload = (category: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      if (req.file) {
        const filename = generateFilename(req.file.originalname);
        const url = await uploadFile(category, filename, req.file.buffer, req.file.mimetype);
        req.file.url = url;
        req.file.filename = filename;
      } 
      
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const filename = generateFilename(file.originalname);
          const url = await uploadFile(category, filename, file.buffer, file.mimetype);
          file.url = url;
          file.filename = filename;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
