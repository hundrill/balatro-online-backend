import { Controller, Get, Post, Body } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
    constructor(private readonly roomService: RoomService) { }

    @Get()
    async findAll() {
        return this.roomService.findAll();
    }

    @Post()
    async create(
        @Body('channelId') channelId: number,
        @Body('name') name: string,
        @Body('status') status: string,
    ) {
        return this.roomService.create({ channelId, name, status });
    }
} 