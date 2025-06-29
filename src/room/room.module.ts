import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';

@Module({
  providers: [RoomService, RoomGateway],
  controllers: [RoomController],
  exports: [RoomService],
})
export class RoomModule {}
