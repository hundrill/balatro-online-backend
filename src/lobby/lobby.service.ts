import { Injectable } from '@nestjs/common';
import { ChannelService } from '../channel/channel.service';
import { RoomService } from '../room/room.service';

@Injectable()
export class LobbyService {
  constructor(
    private readonly channelService: ChannelService,
    private readonly roomService: RoomService,
  ) {}

  async getLobbyInfo() {
    const channels = await this.channelService.findAll();
    const rooms = await this.roomService.findAll();
    return { channels, rooms };
  }
}
