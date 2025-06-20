import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChannelService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.channel.findMany();
    }

    async create(name: string) {
        return this.prisma.channel.create({ data: { name } });
    }
} 