import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { LoginResponse } from 'src/resources/auth/dto/login.response';
import { UserService } from 'src/resources/user/user.service';
import { LoginDto } from './dto/login.dto';

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
      return { user, token: this.jwtService.sign(payload) };
    }
    return null;
  }
}
