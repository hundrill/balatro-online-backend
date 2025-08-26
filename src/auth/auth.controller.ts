import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(
    @Body('userId') userId: string,
    @Body('password') password: string,
    @Body('nickname') nickname: string,
  ) {
    return this.authService.register(userId, password, nickname);
  }
}
