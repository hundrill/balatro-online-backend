import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChannelService } from './channel.service';

@Controller('channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  async findAll() {
    return this.channelService.findAll();
  }

  @Post()
  async create(@Body('name') name: string) {
    return this.channelService.create(name);
  }
}
