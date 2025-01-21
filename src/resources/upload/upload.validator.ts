import { BadRequestException } from '@nestjs/common';
import { FileTypeResult, fromBuffer } from 'file-type';
import { extname } from 'path';

export class UploadValidator {
  private static readonly ALLOWED_IMAGE_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
  ]);

  private static readonly ALLOWED_AUDIO_MIMES = new Set([
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
  ]);

  private static readonly ALLOWED_IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
  ]);

  private static readonly ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav']);

  static async validateFile(
    file: Express.Multer.File,
    type: 'image' | 'sound',
  ): Promise<void> {
    // Vérifier si le fichier existe
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Vérifier l'extension du fichier
    const ext = extname(file.originalname).toLowerCase();
    const allowedExtensions =
      type === 'image'
        ? UploadValidator.ALLOWED_IMAGE_EXTENSIONS
        : UploadValidator.ALLOWED_AUDIO_EXTENSIONS;

    if (!allowedExtensions.has(ext)) {
      throw new BadRequestException(`Invalid file extension: ${ext}`);
    }

    // Vérifier le type MIME déclaré
    const allowedMimes =
      type === 'image'
        ? UploadValidator.ALLOWED_IMAGE_MIMES
        : UploadValidator.ALLOWED_AUDIO_MIMES;

    if (!allowedMimes.has(file.mimetype)) {
      throw new BadRequestException(`Invalid mime type: ${file.mimetype}`);
    }

    // Vérifier le contenu réel du fichier
    let fileTypeResult: FileTypeResult | undefined;
    try {
      fileTypeResult = await fromBuffer(file.buffer);
    } catch (error) {
      throw new BadRequestException('Could not determine file type');
    }

    if (!fileTypeResult) {
      throw new BadRequestException('Could not determine file type');
    }

    const actualMime = fileTypeResult.mime;
    if (!allowedMimes.has(actualMime)) {
      throw new BadRequestException(
        `Invalid file content type: ${actualMime}. File appears to be masquerading as ${file.mimetype}`,
      );
    }
  }

  static sanitizeFilename(filename: string): string {
    // Supprimer tous les caractères non autorisés
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Remplacer les caractères spéciaux par _
      .replace(/\.{2,}/g, '.') // Empêcher les .. dans le nom de fichier
      .replace(/^\.+|\.+$/g, '') // Supprimer les points au début et à la fin
      .substring(0, 255); // Limiter la longueur du nom de fichier
  }
}
