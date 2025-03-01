import {
  Body,
  Controller,
  Delete,
  Post,
  Put,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorators/public.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LoginResponse } from 'src/resources/auth/dto/login.response';
import { UpdateDisplayNameDto } from 'src/resources/auth/dto/update-display-name.dto';
import { UpdateImageDto } from 'src/resources/auth/dto/update-image.dto';
import { User } from 'src/resources/user/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Authentification utilisateur',
    description:
      'Permet à un utilisateur de se connecter avec son username et son mot de passe',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Identifiants de connexion',
    examples: {
      example: {
        value: {
          username: 'john_doe',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Authentification réussie - Retourne les informations utilisateur et le token JWT',
    type: LoginResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Identifiants invalides',
  })
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authService.validateUser(loginDto);
    if (!response?.token) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return response;
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Création de compte utilisateur',
    description:
      'Permet de créer un nouveau compte utilisateur avec un username unique',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Informations de création de compte',
    examples: {
      example: {
        value: {
          username: 'new_user',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Compte créé avec succès - Retourne les informations utilisateur et le token JWT',
    type: LoginResponse,
  })
  @ApiResponse({
    status: 409,
    description: "Le nom d'utilisateur existe déjà",
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (ex: mot de passe trop court)',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('username')
  @ApiOperation({
    summary: "Mettre à jour le nom d'utilisateur",
    description: "Permet à un utilisateur de modifier son nom d'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: "Nom d'utilisateur mis à jour avec succès",
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Nom invalide (ex: déjà utilisé ou vide)',
  })
  async updateUsername(
    @Request() req,
    @Body() updateUsernameDto: UpdateUsernameDto,
  ) {
    return this.authService.updateUsername(
      req.user.sub,
      updateUsernameDto.username,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('display-name')
  @ApiOperation({
    summary: 'Mettre à jour le pseudonyme',
    description: 'Permet à un utilisateur de modifier son pseudonyme',
  })
  @ApiResponse({
    status: 200,
    description: 'Pseudonyme mis à jour avec succès',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Pseudonyme invalide (ex: déjà utilisé ou vide)',
  })
  async updateDisplayName(
    @Request() req,
    @Body() updateDisplayNameDto: UpdateDisplayNameDto,
  ) {
    return this.authService.updateDisplayName(
      req.user.sub,
      updateDisplayNameDto.displayName,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('image')
  @ApiOperation({
    summary: "Mettre à jour l'image de profil",
    description: 'Permet à un utilisateur de modifier son image de profil',
  })
  @ApiResponse({
    status: 200,
    description: "Image de l'utilisateur mise à jour avec succès",
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'URL Image invalide (ex: URL vide)',
  })
  async updateImage(@Request() req, @Body() updateImageDto: UpdateImageDto) {
    return this.authService.updateImage(req.user.sub, updateImageDto.image);
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  @ApiOperation({
    summary: 'Mettre à jour le mot de passe',
    description: 'Permet à un utilisateur de modifier son mot de passe',
  })
  async updatePassword(
    @Request() req,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.authService.updatePassword(
      req.user.sub,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
    return { message: 'Mot de passe mis à jour avec succès' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Rafraîchir le token JWT',
    description: 'Permet de rafraîchir le token JWT avant son expiration',
  })
  @ApiResponse({
    status: 200,
    description: 'Token rafraîchi avec succès',
    type: LoginResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalide ou expiré',
  })
  async refreshToken(@Request() req) {
    const user = req.user;
    return this.authService.refreshToken(user);
  }

  @Delete()
  @ApiOperation({
    summary: 'Supprimer le compte',
    description: 'Permet à un utilisateur de supprimer son compte',
  })
  @ApiResponse({
    status: 200,
    description: 'Compte supprimé avec succès',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async deleteAccount(@Request() req) {
    await this.authService.deleteAccount(req.user.sub);
    return { message: 'Compte supprimé avec succès' };
  }
}
