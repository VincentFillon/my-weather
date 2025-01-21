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
      const payload = {
        username: user.username,
        sub: user._id,
        role: user.role,
      };
      const token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
      });
      return { user, token };
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
      role: Role.USER, // Par défaut, les nouveaux utilisateurs ont le rôle USER
    });

    // Générer le token JWT
    const payload = {
      username: user.username,
      sub: user._id,
      role: user.role,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });

    return {
      user,
      token,
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
