import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { ChannelModule } from '../channel/channel.module';
import { RoomModule } from '../room/room.module';

@Module({
    imports: [ChannelModule, RoomModule],
    providers: [LobbyService],
    controllers: [LobbyController],
})
export class LobbyModule { } 