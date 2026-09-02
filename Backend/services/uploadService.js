import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const uploadDir = path.resolve(__dirname, '..', 'static', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Save a file buffer to local disk under /static/uploads.
 * Returns a URL path that can be served via express.static.
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimetype  - MIME type (image/jpeg, image/png, image/webp)
 * @returns {Promise<string>} - Relative URL path of the saved file
 */
export async function uploadFile(fileBuffer, mimetype) {
  const ext = MIME_TO_EXT[mimetype] || '.bin';
  const filename = `${uuidv4().replace(/-/g, '')}${ext}`;
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, fileBuffer);

  return `/static/uploads/${filename}`;
}
