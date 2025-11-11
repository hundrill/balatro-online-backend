import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isClientVersionSupported, MIN_CLIENT_VERSION, getVersionString } from '../common/constants/version.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) { }


  async validateUser(userId: string, password: string) {
    const user = await this.userService.findByUserId(userId);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  // 중복 접속 체크 및 연결 등록
  async checkAndRegisterConnection(userId: string) {
    const isNewConnection = await this.redisService.addChannelMember(userId);
    return {
      isNewConnection,
      message: isNewConnection
        ? '로그인 성공'
        : '이미 다른 곳에서 접속 중입니다',
    };
  }

  // 연결 해제
  async removeRedisChannelMember(userId: string) {
    await this.redisService.removeChannelMember(userId);
  }

  // 사용자 연결 상태 확인
  async isUserConnected(userId: string) {
    return await this.redisService.isUserConnected(userId);
  }

  // JWT 토큰 생성
  async generateToken(user: any) {
    const payload = {
      sub: user.userId,
      username: user.nickname,
      userId: user.userId
    };
    return this.jwtService.sign(payload);
  }

  // 로그인 처리 (JWT 토큰 포함)
  async login(userId: string, password: string, version: number) {
    // 버전 체크
    if (!isClientVersionSupported(version)) {
      return {
        success: false,
        code: 1003,
        message: `Client version ${getVersionString(version)} is not supported. Required: ${getVersionString(MIN_CLIENT_VERSION)} or higher`
      };
    }

    const user = await this.validateUser(userId, password);
    if (!user) {
      return {
        success: false,
        code: 1001,
        message: 'Authentication failed'
      };
    }

    const isConnected = await this.isUserConnected(userId);
    if (isConnected) {
      return {
        success: false,
        code: 1004,
        message: 'Already connected from another location'
      };
    }

    const token = await this.generateToken(user);

    return {
      success: true,
      code: 0,
      message: 'Login successful',
      token,
      userId: user.userId,
      nickname: user.nickname,
      silverChip: user.silverChip,
      goldChip: user.goldChip,
      createdAt: user.createdAt.toISOString()
    };
  }
}
