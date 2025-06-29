import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GameHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.gameHistory.findMany();
  }

  async create(data: { roomId: number; startedAt: Date; endedAt?: Date }) {
    return this.prisma.gameHistory.create({ data });
  }
}
