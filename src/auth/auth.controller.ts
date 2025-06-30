import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('nickname') nickname: string,
  ) {
    return this.authService.register(email, password, nickname);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return {
        success: false,
        code: 1001,
        message: 'Invalid credentials',
        user: null,
      };
    }
    // JWT 발급은 추후 구현
    return {
      success: true,
      code: 0,
      message: 'Login successful',
      user,
    };
  }
}
