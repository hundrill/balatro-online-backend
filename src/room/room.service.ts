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
import {
  getRandomJokerCards,
  JokerCard,
  PlanetCard,
  TarotCard,
} from './joker-cards.util';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  private gameStates: Map<
    string,
    { deck: Card[]; hands: Map<string, Card[]>; started: boolean }
  > = new Map();

  private handPlayMap: Map<string, Map<string, Card[]>> = new Map(); // roomId -> userId -> hand

  // nextRound 준비 상태 관리용 Map
  private nextRoundReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // 게임 시작 준비 상태 관리용 Map
  private gameReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // roomId별 샵 카드 5장 상태 관리
  private shopCardsMap: Map<string, (JokerCard | PlanetCard | TarotCard)[]> =
    new Map();

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

  setReady(roomId: string, userId: string) {
    if (!this.gameReadyMap.has(roomId)) {
      this.gameReadyMap.set(roomId, new Set());
    }
    this.gameReadyMap.get(roomId)!.add(userId);
    this.logger.log(
      `[setReady] userId=${userId}가 roomId=${roomId}에서 준비 완료`,
    );
  }

  canStart(roomId: string): boolean {
    try {
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
          '[canStart] RoomGateway 인스턴스 또는 server가 없습니다.',
        );
        return false;
      }

      const adapter = (
        gateway.server as {
          of: (ns: string) => { adapter: { rooms: Map<string, Set<string>> } };
        }
      ).of('/').adapter;

      const room = adapter.rooms.get(roomId);
      if (!room) {
        this.logger.warn(`[canStart] roomId=${roomId}에 해당하는 room 없음`);
        return false;
      }

      // 방에 있는 모든 유저 ID 가져오기
      const userIds: string[] = [];
      if (gateway.socketIdToUserId) {
        for (const socketId of room) {
          const uid = gateway.socketIdToUserId.get(socketId);
          if (uid) userIds.push(uid);
        }
      }

      if (userIds.length === 0) {
        this.logger.warn(`[canStart] roomId=${roomId}에 유저가 없음`);
        return false;
      }

      // 준비된 유저들 가져오기
      const readySet = this.gameReadyMap.get(roomId);
      const readyUsers = readySet ? Array.from(readySet) : [];

      // 모든 유저가 준비되었는지 확인
      const allReady =
        userIds.length > 0 &&
        userIds.every((userId) => readyUsers.includes(userId));

      this.logger.log(
        `[canStart] roomId=${roomId}, allReady=${allReady}, users=${userIds.join(',')}, ready=${readyUsers.join(',')}`,
      );

      return allReady;
    } catch (error) {
      this.logger.error(
        `[canStart] Error checking if game can start: roomId=${roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  startGame(roomId: string) {
    this.logger.log(
      `[startGame] === 게임 시작 단계 진입: roomId=${roomId} ===`,
    );
    // handPlayMap, nextRoundReadyMap 초기화
    this.handPlayMap.delete(roomId);
    this.nextRoundReadyMap.delete(roomId);
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

    // 샵 카드 5장 생성 (조커만)
    const shopCardsRaw: JokerCard[] = getRandomJokerCards(5);
    // type 필드 추가
    const shopCards = shopCardsRaw.map((card) => ({ ...card, type: 'joker' }));
    this.shopCardsMap.set(roomId, shopCards);
    this.logger.log(
      `[startGame] 샵 카드 3장(조커만) 생성 및 저장: roomId=${roomId}, cards=${JSON.stringify(shopCards)}`,
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

  async removeUserFromRoom(
    roomId: string,
    userId: string,
    socketIdToRoomIds: Map<string, Set<string>>,
    socketIdToUserId: Map<string, string>,
  ) {
    // 해당 방에 속한 모든 socketId를 찾음
    const socketIdsInRoom: string[] = [];
    for (const [socketId, roomIds] of socketIdToRoomIds.entries()) {
      if (roomIds.has(roomId)) {
        // 해당 소켓이 이 방에 속해 있음
        if (socketIdToUserId.get(socketId) === userId) {
          roomIds.delete(roomId);
          if (roomIds.size === 0) socketIdToRoomIds.delete(socketId);
        }
        socketIdsInRoom.push(socketId);
      }
    }
    // 방에 남은 유저가 있는지 체크
    const remainingUserIds = new Set<string>();
    for (const socketId of socketIdsInRoom) {
      const uid = socketIdToUserId.get(socketId);
      if (uid) remainingUserIds.add(uid);
    }
    if (remainingUserIds.size === 0) {
      await this.deleteRoom(roomId);
    }
  }

  /**
   * 유저가 선택한 카드(suit/rank)들을 버리고, 덱에서 새 카드로 교체한다.
   * @param roomId
   * @param userId
   * @param cards 버릴 카드의 suit/rank 배열
   * @returns { newHand, discarded }
   */
  discardAndDraw(
    roomId: string,
    userId: string,
    cards: { suit: string; rank: number }[],
  ): { newHand: Card[]; discarded: Card[] } {
    const state = this.gameStates.get(roomId);
    if (!state) throw new Error('Room state not found');
    const hand = state.hands.get(userId);
    if (!hand) throw new Error('User hand not found');
    const discarded: Card[] = [];
    for (const cardInfo of cards) {
      const idx = hand.findIndex(
        (c) => c.suit === cardInfo.suit && c.rank === cardInfo.rank,
      );
      if (idx !== -1) {
        discarded.push(hand.splice(idx, 1)[0]);
      }
    }
    // 덱에서 새 카드 draw
    const newCards: Card[] = state.deck.splice(0, discarded.length);
    hand.push(...newCards);
    state.hands.set(userId, hand);
    return { newHand: [...hand], discarded };
  }

  handPlayReady(roomId: string, userId: string, hand: Card[]): void {
    if (!this.handPlayMap.has(roomId)) {
      this.handPlayMap.set(roomId, new Map());
    }
    this.handPlayMap.get(roomId)!.set(userId, hand);
    this.logger.log(
      `[handPlayReady] userId=${userId}, roomId=${roomId}, hand=${JSON.stringify(hand)}`,
    );
  }

  canRevealHandPlay(roomId: string, userIds: string[]): boolean {
    const handMap = this.handPlayMap.get(roomId);
    if (!handMap) return false;
    const allReady = userIds.every((uid) => handMap.has(uid));
    this.logger.log(
      `[canRevealHandPlay] roomId=${roomId}, allReady=${allReady}, users=${userIds.join(',')}, submitted=${handMap ? Array.from(handMap.keys()).join(',') : ''}`,
    );
    return allReady;
  }

  getAllHandPlays(roomId: string): { userId: string; hand: Card[] }[] {
    const handMap = this.handPlayMap.get(roomId);
    if (!handMap) return [];
    const result: { userId: string; hand: Card[] }[] = [];
    for (const [userId, hand] of handMap.entries()) {
      result.push({ userId, hand });
    }
    this.logger.log(
      `[getAllHandPlays] roomId=${roomId}, result=${JSON.stringify(result)}`,
    );
    return result;
  }

  setNextRoundReady(roomId: string, userId: string): void {
    if (!this.nextRoundReadyMap.has(roomId)) {
      this.nextRoundReadyMap.set(roomId, new Set());
    }
    this.nextRoundReadyMap.get(roomId)!.add(userId);
    this.logger.log(`[nextRoundReady] userId=${userId}, roomId=${roomId}`);
  }

  canStartNextRound(roomId: string, userIds: string[]): boolean {
    const readySet = this.nextRoundReadyMap.get(roomId);
    if (!readySet) return false;
    const allReady = userIds.every((uid) => readySet.has(uid));
    this.logger.log(
      `[canStartNextRound] roomId=${roomId}, allReady=${allReady}, users=${userIds.join(',')}, ready=${readySet ? Array.from(readySet).join(',') : ''}`,
    );
    return allReady;
  }

  // 현재 라운드 샵 카드 5장 반환
  getShopCards(roomId: string): (JokerCard | PlanetCard | TarotCard)[] {
    return this.shopCardsMap.get(roomId) ?? [];
  }

  // 카드 구매 처리
  buyCard(
    roomId: string,
    userId: string,
    cardId: string,
    cardType: string,
    price: number,
  ): {
    success: boolean;
    message: string;
    cardName?: string;
    cardDescription?: string;
    cardSprite?: number;
  } {
    try {
      this.logger.log(
        `[buyCard] 구매 시도: roomId=${roomId}, userId=${userId}, cardId=${cardId}, cardType=${cardType}, price=${price}`,
      );

      // 1. 샵 카드 목록에서 해당 카드 찾기
      const shopCards = this.shopCardsMap.get(roomId);
      if (!shopCards) {
        this.logger.warn(
          `[buyCard] roomId=${roomId}에 대한 샵 카드가 없습니다.`,
        );
        return { success: false, message: '샵 카드를 찾을 수 없습니다.' };
      }

      const cardIndex = shopCards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) {
        this.logger.warn(
          `[buyCard] cardId=${cardId}인 카드를 샵에서 찾을 수 없습니다.`,
        );
        return { success: false, message: '해당 카드를 찾을 수 없습니다.' };
      }

      const card = shopCards[cardIndex];

      // 2. 가격 검증
      if (card.price !== price) {
        this.logger.warn(
          `[buyCard] 가격 불일치: 요청된 가격=${price}, 실제 가격=${card.price}`,
        );
        return { success: false, message: '카드 가격이 일치하지 않습니다.' };
      }

      // 3. 유저의 돈 검증 (임시로 무제한으로 설정, 나중에 실제 돈 시스템 구현 시 수정)
      // TODO: 실제 유저 돈 시스템 구현 시 여기서 돈 차감 로직 추가
      // const userMoney = await this.getUserMoney(userId);
      // if (userMoney < price) {
      //   return { success: false, message: '돈이 부족합니다.' };
      // }

      // 4. 카드 구매 처리
      // 샵에서 카드 제거
      shopCards.splice(cardIndex, 1);
      this.shopCardsMap.set(roomId, shopCards);

      // 5. 유저의 조커 카드 목록에 추가 (임시로 로그만 출력)
      this.logger.log(
        `[buyCard] 구매 완료: userId=${userId}가 ${card.name}(${cardId}) 구매, 가격=${price}`,
      );

      // TODO: 유저의 조커 카드 목록에 실제로 추가하는 로직 구현
      // await this.addJokerToUser(userId, card);

      return {
        success: true,
        message: '카드 구매가 완료되었습니다.',
        cardName: card.name,
        cardDescription: card.description,
        cardSprite: card.sprite,
      };
    } catch (error) {
      this.logger.error(
        `[buyCard] Error: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '카드 구매 중 오류가 발생했습니다.' };
    }
  }
}
