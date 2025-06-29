import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import {
  RoomNotFoundException,
  RoomFullException,
  UserAlreadyInRoomException,
  UserNotInRoomException,
  RedisConnectionException,
} from '../common/exceptions/room.exception';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  async findAll() {
    try {
      this.logger.log('Fetching all rooms from database');
      const rooms = await this.prisma.room.findMany();
      this.logger.log(`Found ${rooms.length} rooms`);
      return rooms;
    } catch (error) {
      this.logger.error('Error fetching rooms from database', error.stack);
      throw error;
    }
  }

  async create(data: { channelId: number; name: string; status: string }) {
    try {
      this.logger.log(`Creating room: ${data.name}`);
      const room = await this.prisma.room.create({ data });
      this.logger.log(`Room created successfully: ${room.id}`);
      return room;
    } catch (error) {
      this.logger.error(`Error creating room: ${data.name}`, error.stack);
      throw error;
    }
  }

  async createRoom(name: string, maxPlayers: number, ownerId: string) {
    try {
      this.logger.log(`Creating Redis room: ${name} by user: ${ownerId}`);
      const roomId = uuidv4();
      const roomKey = `room:${roomId}`;
      const roomData = {
        roomId,
        name,
        maxPlayers,
        players: 1,
        status: 'waiting',
        createdAt: Date.now(),
        ownerId,
      };

      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      await client.sadd('rooms', roomId);
      await client.sadd(`room:${roomId}:users`, ownerId);

      this.logger.log(`Room created successfully: ${roomId}`);
      return roomData;
    } catch (error) {
      this.logger.error(`Error creating Redis room: ${name}`, error.stack);
      throw new RedisConnectionException(error.message);
    }
  }

  async joinRoom(roomId: string, userId: string) {
    try {
      this.logger.log(`User ${userId} attempting to join room ${roomId}`);
      const client = this.redisService.getClient();
      const roomKey = `room:${roomId}`;
      const usersKey = `room:${roomId}:users`;

      const room = await client.hgetall(roomKey);
      if (!room || !room.roomId) {
        this.logger.warn(`Room not found: ${roomId}`);
        throw new RoomNotFoundException(roomId);
      }

      // 이미 방에 있는지 확인
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (isUserInRoom) {
        this.logger.warn(`User ${userId} is already in room ${roomId}`);
        throw new UserAlreadyInRoomException(userId, roomId);
      }

      const currentPlayers = parseInt(room.players || '1', 10);
      const maxPlayers = parseInt(room.maxPlayers || '4', 10);

      if (currentPlayers >= maxPlayers) {
        this.logger.warn(`Room ${roomId} is full (${currentPlayers}/${maxPlayers})`);
        throw new RoomFullException(roomId);
      }

      const newPlayers = currentPlayers + 1;
      await client.hset(roomKey, 'players', newPlayers);
      await client.sadd(usersKey, userId);

      this.logger.log(`User ${userId} joined room ${roomId} (${newPlayers}/${maxPlayers})`);
      return { ...room, players: newPlayers };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error joining room ${roomId} by user ${userId}`, error.stack);
      throw new RedisConnectionException(error.message);
    }
  }

  async findAllRoomsInRedis(): Promise<any[]> {
    try {
      this.logger.log('Fetching all rooms from Redis');
      const client = this.redisService.getClient();
      const roomIds: string[] = await client.smembers('rooms');

      const rooms = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            const room = await client.hgetall(`room:${roomId}`);
            return room && room.roomId ? room : null;
          } catch (error) {
            this.logger.warn(`Error fetching room ${roomId}`, error.message);
            return null;
          }
        })
      );

      const validRooms = rooms.filter((room) => room);
      this.logger.log(`Found ${validRooms.length} valid rooms from Redis`);
      return validRooms;
    } catch (error) {
      this.logger.error('Error fetching rooms from Redis', error.stack);
      throw new RedisConnectionException(error.message);
    }
  }

  async leaveRoom(roomId: string, userId: string) {
    try {
      this.logger.log(`User ${userId} attempting to leave room ${roomId}`);
      const client = this.redisService.getClient();
      const roomKey = `room:${roomId}`;
      const usersKey = `room:${roomId}:users`;

      const room = await client.hgetall(roomKey);
      if (!room || !room.roomId) {
        this.logger.warn(`Room not found: ${roomId}`);
        throw new RoomNotFoundException(roomId);
      }

      // 방에 있는지 확인
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (!isUserInRoom) {
        this.logger.warn(`User ${userId} is not in room ${roomId}`);
        throw new UserNotInRoomException(userId, roomId);
      }

      const currentPlayers = parseInt(room.players || '1', 10);
      const newPlayers = currentPlayers - 1;

      await client.srem(usersKey, userId);

      if (newPlayers <= 0) {
        this.logger.log(`Room ${roomId} is empty, deleting room`);
        await this.deleteRoom(roomId);
        return { deleted: true };
      } else {
        await client.hset(roomKey, 'players', newPlayers);
        this.logger.log(`User ${userId} left room ${roomId} (${newPlayers} remaining)`);
        return { ...room, players: newPlayers };
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error leaving room ${roomId} by user ${userId}`, error.stack);
      throw new RedisConnectionException(error.message);
    }
  }

  async deleteRoom(roomId: string) {
    try {
      this.logger.log(`Deleting room: ${roomId}`);
      const client = this.redisService.getClient();
      await client.del(`room:${roomId}`);
      await client.del(`room:${roomId}:users`);
      await client.srem('rooms', roomId);
      this.logger.log(`Room ${roomId} deleted successfully`);
      return { deleted: true };
    } catch (error) {
      this.logger.error(`Error deleting room ${roomId}`, error.stack);
      throw new RedisConnectionException(error.message);
    }
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    try {
      this.logger.log(`Fetching users for room: ${roomId}`);
      const client = this.redisService.getClient();
      const usersKey = `room:${roomId}:users`;
      const users = await client.smembers(usersKey);
      this.logger.log(`Found ${users.length} users in room ${roomId}`);
      return users;
    } catch (error) {
      this.logger.error(`Error fetching users for room ${roomId}`, error.stack);
      throw new RedisConnectionException(error.message);
    }
  }
}
