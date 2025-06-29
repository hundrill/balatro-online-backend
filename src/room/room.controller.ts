import { Controller, Get, Post, Body, Req, Param, Delete, Logger } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { Request } from 'express';
import { RoomValidator } from '../common/validators/room.validator';

@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(private readonly roomService: RoomService) { }

  @Get()
  async findAll() {
    try {
      this.logger.log('GET /rooms - Fetching all rooms from database');
      const rooms = await this.roomService.findAll();
      return { success: true, rooms };
    } catch (error) {
      this.logger.error('Error in GET /rooms', error.stack);
      throw error;
    }
  }

  @Post()
  async create(
    @Body('channelId') channelId: number,
    @Body('name') name: string,
    @Body('status') status: string,
  ) {
    try {
      this.logger.log(`POST /rooms - Creating room: ${name}`);
      const room = await this.roomService.create({ channelId, name, status });
      return { success: true, room };
    } catch (error) {
      this.logger.error(`Error in POST /rooms - Creating room: ${name}`, error.stack);
      throw error;
    }
  }

  // Redis 기반 방 생성
  @Post('create')
  async createRoom(@Body() dto: CreateRoomDto, @Req() req: Request) {
    try {
      const ownerId = (req as any).user?.id || 'test-user';
      this.logger.log(`POST /rooms/create - Creating Redis room: ${dto.name} by user: ${ownerId}`);

      // 입력 데이터 검증
      RoomValidator.validateCreateRoomData(dto);
      RoomValidator.validateUserId(ownerId);

      const room = await this.roomService.createRoom(
        dto.name,
        dto.maxPlayers,
        ownerId,
      );
      return { success: true, roomId: room.roomId, room };
    } catch (error) {
      this.logger.error(`Error in POST /rooms/create - Creating room: ${dto.name}`, error.stack);
      throw error;
    }
  }

  // Redis 기반 방 입장
  @Post('join')
  async joinRoom(@Body() dto: JoinRoomDto, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || 'test-user';
      this.logger.log(`POST /rooms/join - User ${userId} joining room: ${dto.roomId}`);

      // 입력 데이터 검증
      RoomValidator.validateJoinRoomData({ roomId: dto.roomId, userId });

      const room = await this.roomService.joinRoom(dto.roomId, userId);
      return { success: true, room };
    } catch (error) {
      this.logger.error(`Error in POST /rooms/join - User joining room: ${dto.roomId}`, error.stack);
      throw error;
    }
  }

  // Redis 기반 방 목록 조회
  @Get('redis')
  async findAllRoomsInRedis() {
    try {
      this.logger.log('GET /rooms/redis - Fetching all rooms from Redis');
      const rooms = await this.roomService.findAllRoomsInRedis();
      return { success: true, rooms };
    } catch (error) {
      this.logger.error('Error in GET /rooms/redis', error.stack);
      throw error;
    }
  }

  // Redis 기반 방 퇴장
  @Post('leave')
  async leaveRoom(@Body('roomId') roomId: string, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || 'test-user';
      this.logger.log(`POST /rooms/leave - User ${userId} leaving room: ${roomId}`);

      const result = await this.roomService.leaveRoom(roomId, userId);
      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`Error in POST /rooms/leave - User leaving room: ${roomId}`, error.stack);
      throw error;
    }
  }

  // Redis 기반 방 삭제
  @Delete(':roomId')
  async deleteRoom(@Param('roomId') roomId: string) {
    try {
      this.logger.log(`DELETE /rooms/${roomId} - Deleting room`);
      const result = await this.roomService.deleteRoom(roomId);
      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`Error in DELETE /rooms/${roomId}`, error.stack);
      throw error;
    }
  }

  // 방 유저 리스트 조회
  @Get(':roomId/users')
  async getRoomUsers(@Param('roomId') roomId: string) {
    try {
      this.logger.log(`GET /rooms/${roomId}/users - Fetching users for room`);
      const users = await this.roomService.getRoomUsers(roomId);
      return { success: true, users };
    } catch (error) {
      this.logger.error(`Error in GET /rooms/${roomId}/users`, error.stack);
      throw error;
    }
  }
}
