import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) { }

  async register(userId: string, password: string, nickname: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userService.create({ userId, passwordHash, nickname });
  }

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
  async removeConnection(userId: string) {
    await this.redisService.removeChannelMember(userId);
  }

  // 사용자 연결 상태 확인
  async isUserConnected(userId: string) {
    return await this.redisService.isUserConnected(userId);
  }
}
