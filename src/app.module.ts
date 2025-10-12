import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ChannelModule } from './channel/channel.module';
import { RoomModule } from './room/room.module';
import { GameHistoryModule } from './game-history/game-history.module';
import { LobbyModule } from './lobby/lobby.module';
import { AdminModule } from './admin/admin.module';
import { DevToolsModule } from './dev-tools/dev-tools.module';
import { CommonModule } from './common/common.module';
import { StressTestModule } from './stresstest/stresstest.module';
import { IAPModule } from './iap/iap.module';
import { ChallengeModule } from './challenge/challenge.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production'
        ? '.env.prod'
        : '.env.dev',
    }),
    PrismaModule,
    RedisModule,
    UserModule,
    AuthModule,
    ChannelModule,
    RoomModule,
    GameHistoryModule,
    LobbyModule,
    AdminModule,
    DevToolsModule,
    CommonModule,
    StressTestModule,
    IAPModule,
    ChallengeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
