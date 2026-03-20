import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB } from '@must-iq/shared-types';

export const documentUploadOptions = {
    storage: memoryStorage(), // Keep in memory, we handle temp write in service
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, MD, ZIP`), false);
        }
    },
};
