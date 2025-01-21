import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from '../auth/enums/role.enum';
import { MediaType } from './enums/media-type.enum';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Récupérer tous les fichiers uploadés',
    description: 'Retourne la liste de tous les fichiers uploadés',
  })
  async findAllUploads() {
    return this.uploadService.findAllUploads();
  }

  @Post('image/user')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadUserImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.saveFile(file, MediaType.IMAGE);
  }

  @Post('image/mood')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadMoodImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.saveFile(file, MediaType.IMAGE);
  }

  @Post('sound/mood')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('sound'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sound: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadMoodSound(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.saveFile(file, MediaType.SOUND);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Supprimer un fichier uploadé',
    description: 'Permet à un administrateur de supprimer un fichier uploadé',
  })
  async removeUpload(@Param('id') id: string) {
    const media = await this.uploadService.findOne(id);
    if (!media) {
      throw new NotFoundException('File not found');
    }
    return this.uploadService.deleteFile(media.filename);
  }
}
