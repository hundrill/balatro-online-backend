import { Controller, Get, Post, Body } from '@nestjs/common';
import { GameHistoryService } from './game-history.service';

@Controller('game-history')
export class GameHistoryController {
  constructor(private readonly gameHistoryService: GameHistoryService) {}

  @Get()
  async findAll() {
    return this.gameHistoryService.findAll();
  }

  @Post()
  async create(
    @Body('roomId') roomId: number,
    @Body('startedAt') startedAt: string,
    @Body('endedAt') endedAt?: string,
  ) {
    return this.gameHistoryService.create({
      roomId,
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : undefined,
    });
  }
}
