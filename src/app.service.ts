import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { PrismaService } from './prisma.service';
import { SpecialCardManagerService } from './room/special-card-manager.service';
import { ChallengeManagerService } from './challenge/challenge-manager.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly specialCardManagerService: SpecialCardManagerService,
    private readonly challengeManagerService: ChallengeManagerService,
  ) { }

  async onModuleInit() {
    // Redis 테스트
    const client = this.redisService.getClient();
    await client.set('test', 'hello');
    const value = await client.get('test');
    console.log('Redis test value:', value); // hello

    // 데이터베이스에서 카드 데이터 로드
    try {
      await this.specialCardManagerService.initializeCards(this.prisma);
      console.log('[AppService] 카드 데이터 로드 완료');
    } catch (error) {
      console.error('[AppService] 카드 데이터 로드 실패:', error);
    }

    // 챌린지 데이터 초기화
    try {
      await this.challengeManagerService.loadChallenges();
      console.log('[AppService] 챌린지 데이터 초기화 완료');
    } catch (error) {
      console.error('[AppService] 챌린지 데이터 초기화 실패:', error);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
