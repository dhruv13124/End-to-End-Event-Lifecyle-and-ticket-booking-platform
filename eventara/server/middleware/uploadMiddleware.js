import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Make sure to use 'import.meta.url' logic where we define __dirname, but let's just stick to absolute or relative cleanly.
const storageFactory = (destFolder) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            // Assuming server/app.js runs from 'server' folder, these paths are relative to root or server running dir.
            // Better to use path.join(process.cwd(), 'server', 'uploads', destFolder)
            cb(null, path.join(process.cwd(), 'server', 'uploads', destFolder));
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${uuidv4()}${ext}`);
        }
    });
};

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG and WEBP images are allowed'), false);
    }
};

// Configs for specific uploads
export const bannerUpload = multer({
    storage: storageFactory('banners'),
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter
});

export const logoUpload = multer({
    storage: storageFactory('logos'),
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter
});

export const avatarUpload = multer({
    storage: storageFactory('avatars'), // NOTE: created implicitly if not exists, but we didn't add avatars folder in mkdir yet. We can add it.
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter
});
