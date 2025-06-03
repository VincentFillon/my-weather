import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { Model } from 'mongoose';
import { join, normalize, resolve } from 'path';
import { Media, MediaDocument } from './entities/media.entity';
import { MediaType } from './enums/media-type.enum';
import { UploadValidator } from './upload.validator';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(@InjectModel(Media.name) private mediaModel: Model<Media>) {
    this.uploadDir = resolve(process.cwd(), 'data');
    // Créer le dossier data s'il n'existe pas
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAllUploads(): Promise<MediaDocument[]> {
    return this.mediaModel.find().exec();
  }

  async findOne(id: string): Promise<MediaDocument> {
    return this.mediaModel.findById(id).exec();
  }

  async saveFile(
    file: Express.Multer.File,
    type: MediaType,
  ): Promise<{ url: string }> {
    // Valider le fichier
    // Cast 'type' to the expected literal types for UploadValidator.validateFile
    await UploadValidator.validateFile(file, type as 'image' | 'sound' | 'media');

    // Générer un nom de fichier unique et sécurisé
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = UploadValidator.sanitizeFilename(
      file.originalname,
    );
    const filename = `${uniqueSuffix}-${sanitizedOriginalName}`;

    // Vérifier que le chemin de destination est sécurisé
    const filePath = this.getSecurePath(filename);

    try {
      // Écrire le fichier
      await writeFile(filePath, file.buffer);

      // Enregistrer le fichier dans la base de données
      const media = new this.mediaModel({
        filename,
        type,
      });
      await media.save();

      return { url: this.getFileUrl(media.filename) };
    } catch (error) {
      throw new BadRequestException('Could not save file');
    }
  }

  async deleteFile(filename: string): Promise<MediaDocument> {
    const filePath = this.getSecurePath(filename);
    try {
      await unlink(filePath);
      return this.mediaModel.findOneAndDelete({ filename }).exec();
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  private getSecurePath(filename: string): string {
    // Nettoyer et valider le chemin
    const sanitizedFilename = UploadValidator.sanitizeFilename(filename);
    const targetPath = normalize(join(this.uploadDir, sanitizedFilename));

    // Vérifier que le chemin est bien dans le dossier data
    if (!targetPath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path');
    }

    return targetPath;
  }

  getFileUrl(filename: string): string {
    return `/data/${UploadValidator.sanitizeFilename(filename)}`;
  }
}
