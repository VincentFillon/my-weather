import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { LoginResponse } from 'src/resources/auth/dto/login.response';
import { UserService } from 'src/resources/user/user.service';
import { UserDocument } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<LoginResponse | null> {
    const user = await this.userService.findByUsername(loginDto.username);
    if (user && (await compare(loginDto.password, user.password))) {
      return this.generateTokenResponse(user);
    }
    return null;
  }

  async register(registerDto: RegisterDto): Promise<LoginResponse> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userService.findByUsername(
      registerDto.username,
    );
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Créer le nouvel utilisateur
    const user = await this.userService.create({
      username: registerDto.username,
      password: registerDto.password,
      displayName: registerDto.username,
      role: Role.USER, // Par défaut, les nouveaux utilisateurs ont le rôle USER
    });

    return this.generateTokenResponse(user);
  }

  async refreshToken(user: any): Promise<LoginResponse> {
    const fullUser = await this.userService.findOne(user.sub);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokenResponse(fullUser);
  }

  private generateTokenResponse(user: UserDocument): LoginResponse {
    const expiresIn = 12 * 60 * 60; // 12 heures en secondes
    const expiresAt = Date.now() + expiresIn * 1000;

    const payload = {
      username: user.username,
      sub: user._id,
      role: user.role,
      activeGroup: user.activeGroup?._id || null,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: `${expiresIn}s`,
    });

    return {
      user,
      token,
      expiresAt,
    };
  }

  async updateUsername(
    userId: string,
    username: string,
  ): Promise<UserDocument> {
    const existingUser = await this.userService.findByUsername(username);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
    }

    return this.userService.update(userId, { _id: userId, username });
  }

  async updateDisplayName(
    userId: string,
    displayName: string,
  ): Promise<UserDocument> {
    const existingUser = await this.userService.findByDisplayName(displayName);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException('Ce pseudonyme est déjà utilisé');
    }

    return this.userService.update(userId, { _id: userId, displayName });
  }

  async updateImage(userId: string, image: string): Promise<UserDocument> {
    return this.userService.update(userId, { _id: userId, image });
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await hash(newPassword, 10);
    await this.userService.update(userId, {
      _id: userId,
      password: hashedPassword,
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.userService.remove(userId);
  }
}
