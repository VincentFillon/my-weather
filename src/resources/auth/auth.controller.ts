import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponse } from 'src/resources/auth/dto/login.response';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login to API' })
  @ApiResponse({
    status: 200,
    description: 'Retourne un token de connexion',
    type: LoginResponse,
  })
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authService.validateUser(loginDto);
    if (!response.token) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return response;
  }
}
