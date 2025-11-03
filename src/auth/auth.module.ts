import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule, ConfigService } from '@nestjs/config'; // ConfigModule, ConfigService 추가

@Module({
  imports: [
    PassportModule,
    UserModule,
    RedisModule,
    // 정적 설정(register) 대신 동적 설정(registerAsync) 사용
    JwtModule.registerAsync({
      imports: [ConfigModule], // ConfigModule을 import하여 사용 준비
      useFactory: async (configService: ConfigService) => ({
        // ConfigService를 통해 환경 변수가 로드된 후 JWT_SECRET 값을 안전하게 가져옴
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService], // useFactory에 ConfigService 주입
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule { }