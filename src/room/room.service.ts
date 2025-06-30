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
import { Card, createDeck, shuffle } from './deck.util';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private gameStates: Map<
    string,
    { deck: Card[]; hands: Map<string, Card[]>; started: boolean }
  > = new Map();

  async findAll() {
    try {
      this.logger.log('Fetching all rooms from database');
      const rooms = await this.prisma.room.findMany();
      this.logger.log(`Found ${rooms.length} rooms`);
      return rooms;
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching rooms from database',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async create(data: { channelId: number; name: string; status: string }) {
    try {
      this.logger.log(`Creating room: ${data.name}`);
      const room = await this.prisma.room.create({ data });
      this.logger.log(`Room created successfully: ${room.id}`);
      return room;
    } catch (error: unknown) {
      this.logger.error(
        `Error creating room: ${data.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async createRoom(name: string, maxPlayers: number) {
    try {
      this.logger.log(`Creating Redis room: ${name}`);
      const roomId = uuidv4();
      const roomKey = `room:${roomId}`;
      const roomData = {
        roomId,
        name,
        maxPlayers,
        players: 1,
        status: 'waiting',
        createdAt: Date.now(),
      };
      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      await client.sadd('rooms', roomId);
      this.logger.log(`Room created successfully: ${roomId}`);
      return roomData;
    } catch (error) {
      this.logger.error(
        `Error creating Redis room: ${name}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
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
        this.logger.warn(
          `Room ${roomId} is full (${currentPlayers}/${maxPlayers})`,
        );
        throw new RoomFullException(roomId);
      }

      const newPlayers = currentPlayers + 1;
      await client.hset(roomKey, 'players', newPlayers);
      await client.sadd(usersKey, userId);

      this.logger.log(
        `User ${userId} joined room ${roomId} (${newPlayers}/${maxPlayers})`,
      );
      return { ...room, players: newPlayers };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error joining room ${roomId} by user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
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
          } catch (error: unknown) {
            this.logger.warn(
              `Error fetching room ${roomId}`,
              error instanceof Error ? error.message : String(error),
            );
            return null;
          }
        }),
      );

      const validRooms = rooms.filter((room) => room);
      this.logger.log(`Found ${validRooms.length} valid rooms from Redis`);
      return validRooms;
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching rooms from Redis',
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
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
        this.logger.log(
          `User ${userId} left room ${roomId} (${newPlayers} remaining)`,
        );
        return { ...room, players: newPlayers };
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error leaving room ${roomId} by user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
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
    } catch (error: unknown) {
      this.logger.error(
        `Error deleting room ${roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
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
    } catch (error: unknown) {
      this.logger.error(
        `Error fetching users for room ${roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new RedisConnectionException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setReady(roomId: string, _userId: string) {
    if (!this.gameStates.has(roomId)) {
      this.gameStates.set(roomId, {
        deck: [],
        hands: new Map(),
        started: false,
      });
    }
    // 실제로는 유저별 ready 상태도 관리 필요
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canStart(_roomId: string): boolean {
    // 소켓 room에 join된 인원만으로 판단하므로, 여기서는 true만 반환
    return true;
  }

  startGame(roomId: string) {
    this.logger.log(
      `[startGame] === 게임 시작 단계 진입: roomId=${roomId} ===`,
    );
    const gateway = (
      global as {
        roomGatewayInstance?: {
          server?: { of: (ns: string) => { adapter: any } };
          socketIdToUserId?: Map<string, string>;
        };
      }
    ).roomGatewayInstance;
    if (!gateway || typeof gateway.server?.of !== 'function') {
      this.logger.warn(
        `[startGame] RoomGateway 인스턴스 또는 server가 없습니다. (global.roomGatewayInstance=${!!gateway}, server=${!!gateway?.server})`,
      );
      return;
    }
    const adapter = (
      gateway.server as {
        of: (ns: string) => { adapter: { rooms: Map<string, Set<string>> } };
      }
    ).of('/').adapter;
    this.logger.log(`[startGame] adapter 조회 결과: ${!!adapter}`);
    let room: Set<string> | undefined;
    if (adapter && adapter.rooms) {
      room = adapter.rooms.get(roomId);
      this.logger.log(
        `[startGame] room 조회 결과: ${room ? Array.from(room).join(',') : '없음'}`,
      );
    }
    if (!room) {
      this.logger.warn(
        `[startGame] roomId=${roomId}에 해당하는 room 없음. 게임 시작 중단`,
      );
      return;
    }
    const userIds: string[] = [];
    if (gateway.socketIdToUserId) {
      for (const socketId of room) {
        const uid = gateway.socketIdToUserId.get(socketId);
        this.logger.log(`[startGame] socketId=${socketId} -> userId=${uid}`);
        if (uid) userIds.push(uid);
      }
    } else {
      throw new Error(
        'socketId <-> userId 매핑이 존재하지 않습니다. 쌍으로 관리되어야 합니다.',
      );
    }
    this.logger.log(`[startGame] userIds 추출 결과: ${userIds.join(',')}`);
    const deck = shuffle(createDeck());
    this.logger.log(
      `[startGame] 카드 덱 셔플 및 생성 완료. 덱 크기: ${deck.length}`,
    );
    const hands = new Map<string, Card[]>();
    for (const userId of userIds) {
      const userHand = deck.splice(0, 8);
      hands.set(userId, userHand);
      this.logger.log(
        `[startGame] userId=${userId}에게 카드 할당: ${JSON.stringify(userHand)}`,
      );
    }
    this.logger.log(
      `[startGame] hands 전체 상태: ${JSON.stringify(Array.from(hands.entries()))}`,
    );
    this.gameStates.set(roomId, { deck, hands, started: true });
    this.logger.log(
      `[startGame] === 게임 상태 저장 완료: roomId=${roomId} ===`,
    );
  }

  getUserHand(roomId: string, userId: string): Card[] {
    const state = this.gameStates.get(roomId);
    if (!state) {
      this.logger.log(
        `[getUserHand] roomId=${roomId}에 대한 상태 없음. userId=${userId}`,
      );
      return [];
    }
    const hand = state.hands.get(userId) ?? [];
    this.logger.log(
      `[getUserHand] userId=${userId}, roomId=${roomId}, hand=${JSON.stringify(hand)}`,
    );
    return hand;
  }

  getOpponentCardCounts(
    roomId: string,
    userId: string,
  ): { userId: string; cardCount: number }[] {
    const state = this.gameStates.get(roomId);
    if (!state) {
      this.logger.log(
        `[getOpponentCardCounts] roomId=${roomId}에 대한 상태 없음. userId=${userId}`,
      );
      return [];
    }
    const result: { userId: string; cardCount: number }[] = [];
    for (const [uid, hand] of state.hands.entries()) {
      if (uid !== userId) {
        result.push({ userId: uid, cardCount: hand.length });
      }
    }
    this.logger.log(
      `[getOpponentCardCounts] userId=${userId}, roomId=${roomId}, opponents=${JSON.stringify(result)}`,
    );
    return result;
  }

  async removeUserFromRoom(roomId: string, userId: string) {
    const client = this.redisService.getClient();
    const usersKey = `room:${roomId}:users`;
    await client.srem(usersKey, userId);
    const users = await client.smembers(usersKey);
    if (users.length === 0) {
      await this.deleteRoom(roomId);
    } else {
      // players 수 갱신
      const roomKey = `room:${roomId}`;
      await client.hset(roomKey, 'players', users.length);
    }
  }

  async removeUserFromAllRooms(userId: string) {
    const client = this.redisService.getClient();
    const roomIds: string[] = await client.smembers('rooms');
    for (const roomId of roomIds) {
      const usersKey = `room:${roomId}:users`;
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (isUserInRoom) {
        await this.removeUserFromRoom(roomId, userId);
      }
    }
  }
}
