import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';

@Module({
  providers: [ChannelService],
  controllers: [ChannelController],
  exports: [ChannelService],
})
export class ChannelModule {}
