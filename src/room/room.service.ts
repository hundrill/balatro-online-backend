import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RoomService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.room.findMany();
    }

    async create(data: { channelId: number; name: string; status: string }) {
        return this.prisma.room.create({ data });
    }
} 