// server/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base upload directories
const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');
const ARTIST_PHOTOS_DIR = path.join(UPLOAD_BASE, 'artist_photos');
const TRACKS_DIR = path.join(UPLOAD_BASE, 'tracks');

// Ensure directories exist (recursive)
[UPLOAD_BASE, ARTIST_PHOTOS_DIR, TRACKS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to create diskStorage with folder and prefix
function createStorage(folder, prefix = '') {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, folder),
    filename: (req, file, cb) => {
      const uid = (req.user && req.user.id) ? String(req.user.id) : 'anon';
      const ts = Date.now();
      const ext = path.extname(file.originalname) || '';
      const base = path.basename(file.originalname, ext)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-_]/g, '');
      cb(null, `${prefix}${uid}-${ts}-${base}${ext}`);
    }
  });
}

// ===== Image upload (artist photos) =====
const imageStorage = createStorage(ARTIST_PHOTOS_DIR, 'img-');
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// ===== Audio upload (tracks) =====
const audioStorage = createStorage(TRACKS_DIR, 'trk-');
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed'), false);
    }
    cb(null, true);
  }
});

module.exports = {
  imageUpload,   // use imageUpload.single('photo')
  audioUpload,   // use audioUpload.single('file')
  ARTIST_PHOTOS_DIR,
  TRACKS_DIR,
  UPLOAD_BASE
};
