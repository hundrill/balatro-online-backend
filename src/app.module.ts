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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
