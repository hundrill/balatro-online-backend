import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const userCount = await this.prisma.user.count();
    const channelCount = await this.prisma.channel.count();
    const roomCount = await this.prisma.room.count();
    const gameHistoryCount = await this.prisma.gameHistory.count();
    return { userCount, channelCount, roomCount, gameHistoryCount };
  }
}
