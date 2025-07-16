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
  // ALL_JOKER_CARDS,
  JokerCard,
  PlanetCard,
  TarotCard,
} from './joker-cards.util';
import { UserService } from '../user/user.service';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  // 채널별 칩 제한 설정
  private readonly channelLimits = {
    0: { minSilverChip: 0, minGoldChip: 0, name: '초급' }, // 초급 채널
    1: { minSilverChip: 100, minGoldChip: 10, name: '중급' }, // 중급 채널
    2: { minSilverChip: 500, minGoldChip: 50, name: '고급' }, // 고급 채널
    3: { minSilverChip: 1000, minGoldChip: 100, name: '마스터' }, // 마스터 채널
    4: { minSilverChip: 0, minGoldChip: 0, name: '무제한' }, // 무제한 채널
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) { }

  private gameStates: Map<
    string,
    {
      decks: Map<string, Card[]>; // userId별 덱
      hands: Map<string, Card[]>;
      round: number;
      phase: 'waiting' | 'playing' | 'shop';
      silverSeedChip?: number; // 실버 시드 칩
      goldSeedChip?: number; // 골드 시드 칩
      silverBettingChip?: number; // 실버 베팅 칩
      goldBettingChip?: number; // 골드 베팅 칩
    }
  > = new Map();

  private handPlayMap: Map<string, Map<string, Card[]>> = new Map(); // roomId -> userId -> hand

  // nextRound 준비 상태 관리용 Map
  private nextRoundReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // 게임 시작 준비 상태 관리용 Map
  private gameReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // roomId별 샵 카드 5장 상태 관리 (모든 유저가 동일한 카드 풀을 사용하도록 Map<string, JokerCard[]>로 변경)
  private shopCardsMap: Map<string, (JokerCard | PlanetCard | TarotCard)[]> =
    new Map();

  // roomId별 다시뽑기 카드 5장 상태 관리 (모든 유저가 동일한 카드 풀을 사용)
  private reRollCardsMap: Map<string, (JokerCard | PlanetCard | TarotCard)[]> =
    new Map();

  // === [1] 유저별 ownedCards 저장용 Map 추가 ===
  private userOwnedCardsMap: Map<
    string,
    Map<string, (JokerCard | PlanetCard | TarotCard)[]>
  > = new Map();

  // === [2] 유저별 칩 정보 저장용 Map 추가 ===
  private userChipsMap: Map<
    string,
    Map<
      string,
      {
        silverChips: number;
        goldChips: number;
        funds: number;
      }
    >
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

  async createRoom(
    name: string,
    maxPlayers: number,
    silverSeedChip?: number,
    goldSeedChip?: number,
    silverBettingChip?: number,
    goldBettingChip?: number,
  ) {
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
        silverSeedChip: silverSeedChip || 0, // 기본값 0
        goldSeedChip: goldSeedChip || 0, // 기본값 0
        silverBettingChip: silverBettingChip || 0, // 기본값 0
        goldBettingChip: goldBettingChip || 0, // 기본값 0
      };
      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      await client.sadd('rooms', roomId);
      this.logger.log(`Room created successfully: ${roomId}`);
      this.logger.log(
        `[createRoom] silverSeedChip parameter: ${silverSeedChip}, goldSeedChip parameter: ${goldSeedChip}`,
      );
      // === 메모리 상태도 초기화 ===
      const gameState = {
        decks: new Map<string, Card[]>(),
        hands: new Map<string, Card[]>(),
        round: 1,
        phase: 'waiting' as const,
        silverSeedChip: silverSeedChip || 0,
        goldSeedChip: goldSeedChip || 0,
        silverBettingChip: silverBettingChip || 0,
        goldBettingChip: goldBettingChip || 0,
      };
      this.gameStates.set(roomId, gameState);
      this.logger.log(
        `[createRoom] gameState set: silverSeedChip=${gameState.silverSeedChip}, goldSeedChip=${gameState.goldSeedChip}`,
      );
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

      // 유저가 방에 입장할 때 칩 정보 초기화 (DB에서 실제 칩 정보 가져와서 메모리에 저장)
      await this.initializeUserChips(roomId, userId);

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
            if (room && room.roomId) {
              // 시드 칩 정보 추가
              const seedChip = this.getSilverSeedChip(roomId);
              return { ...room, seedChip };
            }
            return null;
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
    // userId별로 덱 셔플
    const decks = new Map<string, Card[]>();
    const hands = new Map<string, Card[]>();
    for (const userId of userIds) {
      const userDeck = shuffle(createDeck());
      decks.set(userId, userDeck);
      const userHand = userDeck.splice(0, 8);
      hands.set(userId, userHand);
      this.logger.log(
        `[startGame] userId=${userId}에게 카드 할당: ${JSON.stringify(userHand)}`,
      );
    }
    this.logger.log(
      `[startGame] hands 전체 상태: ${JSON.stringify(Array.from(hands.entries()))}`,
    );
    const prevState = this.gameStates.get(roomId);
    const round = prevState?.round ?? 1;
    this.gameStates.set(roomId, {
      decks,
      hands,
      round,
      phase: 'playing',
      silverSeedChip: prevState?.silverSeedChip,
      goldSeedChip: prevState?.goldSeedChip,
      silverBettingChip: prevState?.silverBettingChip,
      goldBettingChip: prevState?.goldBettingChip,
    });
    this.logger.log(
      `[startGame] === 게임 상태 저장 완료: roomId=${roomId}, round=${round} ===`,
    );
    const shopCardsRaw: JokerCard[] = getRandomJokerCards(5);
    const shopCards = shopCardsRaw.map((card) => ({ ...card, type: 'joker' }));
    this.shopCardsMap.set(roomId, shopCards);
    this.logger.log(
      `[startGame] 공통 샵 카드 5장 생성 및 저장: roomId=${roomId}, cards=${JSON.stringify(shopCards)}`,
    );

    // 새로운 라운드 시작 시 다시뽑기 카드 초기화
    this.reRollCardsMap.delete(roomId);
    this.logger.log(`[startGame] 다시뽑기 카드 초기화: roomId=${roomId}`);

    // 새로운 라운드 시작 시 모든 유저의 funds를 0으로 초기화
    const userChipsMap = this.userChipsMap.get(roomId);
    if (userChipsMap) {
      for (const [userId, chips] of userChipsMap.entries()) {
        userChipsMap.set(userId, {
          ...chips,
          funds: 0,
        });
      }
      this.logger.log(
        `[startGame] 모든 유저의 funds를 0으로 초기화: roomId=${roomId}`,
      );
    }
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
    const deck = state.decks.get(userId);
    if (!deck) throw new Error('User deck not found');
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
    const newCards: Card[] = deck.splice(0, discarded.length);
    hand.push(...newCards);
    state.hands.set(userId, hand);
    state.decks.set(userId, deck);
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

  // 다시뽑기 카드 5장 반환 (이미 생성된 경우 기존 카드 반환, 없으면 새로 생성)
  getReRollCards(roomId: string): (JokerCard | PlanetCard | TarotCard)[] {
    let reRollCards = this.reRollCardsMap.get(roomId);

    // 아직 다시뽑기 카드가 생성되지 않은 경우 새로 생성
    if (!reRollCards) {
      const reRollCardsRaw: JokerCard[] = getRandomJokerCards(5);
      reRollCards = reRollCardsRaw.map((card) => ({ ...card, type: 'joker' }));
      this.reRollCardsMap.set(roomId, reRollCards);
      this.logger.log(
        `[getReRollCards] 다시뽑기 카드 5장 생성 및 저장: roomId=${roomId}, cards=${JSON.stringify(reRollCards)}`,
      );
    }

    return reRollCards;
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
      // 1. 샵 카드 목록에서 해당 카드 찾기 (공통 풀) - 먼저 shopCardsMap에서 찾고, 없으면 reRollCardsMap에서 찾기
      const shopCards = this.shopCardsMap.get(roomId);
      let shopCard = shopCards?.find((card) => card.id === cardId);

      // shopCardsMap에서 찾지 못한 경우 reRollCardsMap에서 찾기
      if (!shopCard) {
        const reRollCards = this.reRollCardsMap.get(roomId);
        shopCard = reRollCards?.find((card) => card.id === cardId);
        if (shopCard) {
          this.logger.log(
            `[buyCard] cardId=${cardId}인 카드를 다시뽑기 카드에서 찾았습니다.`,
          );
        }
      }

      if (!shopCard) {
        this.logger.warn(
          `[buyCard] cardId=${cardId}인 카드를 샵이나 다시뽑기 카드에서 찾을 수 없습니다.`,
        );
        return { success: false, message: '해당 카드를 찾을 수 없습니다.' };
      }

      // 2. 가격 검증
      if (shopCard.price !== price) {
        this.logger.warn(
          `[buyCard] 가격 불일치: 요청된 가격=${price}, 실제 가격=${shopCard.price}`,
        );
        return { success: false, message: '카드 가격이 일치하지 않습니다.' };
      }
      // 3. 유저의 조커카드 개수 제한(최대 5장)
      const ownedCards = this.getUserOwnedCards(roomId, userId);
      const ownedJokerCount = ownedCards.length;
      if (ownedJokerCount >= 5) {
        this.logger.warn(
          `[buyCard] userId=${userId}는 이미 조커카드를 5장 보유 중. 구매 불가.`,
        );
        return {
          success: false,
          message: '조커 카드는 최대 5장까지만 보유할 수 있습니다.',
        };
      } else {
        this.logger.log(`[buyCard] 구매 시도 조커 갯수: ${ownedJokerCount}`);
      }
      // 4. 이미 소유한 조커인지 확인 (중복 구매 방지)
      if (ownedCards.some((card) => card.id === cardId)) {
        this.logger.warn(
          `[buyCard] userId=${userId}는 이미 cardId=${cardId} 조커를 보유 중. 중복 구매 불가.`,
        );
        return {
          success: false,
          message: '이미 보유한 조커 카드는 중복 구매할 수 없습니다.',
        };
      }
      // 5. 카드 구매 처리 (샵 카드 풀은 그대로 두고, 유저별 ownedCards에만 추가)
      if (!this.userOwnedCardsMap.has(roomId)) {
        this.userOwnedCardsMap.set(roomId, new Map());
      }
      const userCardsMap = this.userOwnedCardsMap.get(roomId)!;
      if (!userCardsMap.has(userId)) {
        userCardsMap.set(userId, []);
      }
      userCardsMap.get(userId)!.push(shopCard);
      return {
        success: true,
        message: '카드 구매가 완료되었습니다.',
        cardName: shopCard.name,
        cardDescription: shopCard.description,
        cardSprite: shopCard.sprite,
      };
    } catch (error) {
      this.logger.error(
        `[buyCard] Error in buyCard: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '카드 구매 중 오류가 발생했습니다.' };
    }
  }

  // === [3] 유저별 ownedCards 조회 함수 추가 ===
  getUserOwnedCards(
    roomId: string,
    userId: string,
  ): (JokerCard | PlanetCard | TarotCard)[] {
    return this.userOwnedCardsMap.get(roomId)?.get(userId) ?? [];
  }

  getRound(roomId: string): number {
    const state = this.gameStates.get(roomId);
    return state?.round ?? 1;
  }

  getSilverSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.silverSeedChip ?? 0;
    this.logger.log(
      `[getSilverSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, silverSeedChip=${state?.silverSeedChip}, result=${result}`,
    );
    return result;
  }

  getGoldSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.goldSeedChip ?? 0;
    this.logger.log(
      `[getGoldSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, goldSeedChip=${state?.goldSeedChip}, result=${result}`,
    );
    return result;
  }

  getSilverBettingChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    return state?.silverBettingChip ?? 0;
  }

  getGoldBettingChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    return state?.goldBettingChip ?? 0;
  }

  // === [4] 유저별 칩 정보 관리 메서드들 ===

  /**
   * 유저의 칩 정보를 초기화합니다. (DB에서 실제 칩 정보를 가져와서 메모리에 저장)
   */
  async initializeUserChips(roomId: string, userId: string): Promise<void> {
    // DB에서 유저의 실제 칩 정보 가져오기
    const dbChips = await this.userService.getUserChips(userId);
    if (
      dbChips == null ||
      dbChips.silverChip == null ||
      dbChips.goldChip == null
    ) {
      this.logger.error(
        `[initializeUserChips] DB에서 칩 정보를 찾을 수 없음: userId=${userId}`,
      );
      throw new Error('유저 칩 정보를 찾을 수 없습니다.');
    }
    if (!this.userChipsMap.has(roomId)) {
      this.userChipsMap.set(roomId, new Map());
    }
    const roomChipsMap = this.userChipsMap.get(roomId)!;
    roomChipsMap.set(userId, {
      silverChips: dbChips.silverChip,
      goldChips: dbChips.goldChip,
      funds: 0, // funds는 게임 시작 시 0으로 초기화
    });
    this.logger.log(
      `[initializeUserChips] roomId=${roomId}, userId=${userId}, ` +
      `DB에서 가져온 칩 정보: silverChips=${dbChips.silverChip}, goldChips=${dbChips.goldChip}, funds=0`,
    );
  }

  /**
   * 유저의 칩 정보를 가져옵니다. (메모리에 없으면 DB에서 조회 후 메모리에 저장)
   */
  async getUserChips(
    roomId: string,
    userId: string,
  ): Promise<{ silverChips: number; goldChips: number; funds: number }> {
    const roomChipsMap = this.userChipsMap.get(roomId);
    if (!roomChipsMap) {
      // 방에 칩 정보가 없으면 DB에서 조회해서 초기화
      await this.initializeUserChips(roomId, userId);
      const newRoomChipsMap = this.userChipsMap.get(roomId);
      return (
        newRoomChipsMap?.get(userId) || {
          silverChips: 0,
          goldChips: 0,
          funds: 0,
        }
      );
    }

    const userChips = roomChipsMap.get(userId);
    if (!userChips) {
      // 유저의 칩 정보가 없으면 DB에서 조회해서 초기화
      await this.initializeUserChips(roomId, userId);
      const newUserChips = roomChipsMap.get(userId);
      return newUserChips || { silverChips: 0, goldChips: 0, funds: 0 };
    }

    return userChips;
  }

  /**
   * 유저의 칩 정보를 업데이트합니다.
   */
  async updateUserChips(
    roomId: string,
    userId: string,
    silverChipChange: number = 0,
    goldChipChange: number = 0,
    fundsChange: number = 0,
  ): Promise<void> {
    const currentChips = await this.getUserChips(roomId, userId);
    const newChips = {
      silverChips: Math.max(0, currentChips.silverChips + silverChipChange),
      goldChips: Math.max(0, currentChips.goldChips + goldChipChange),
      funds: Math.max(0, currentChips.funds + fundsChange),
    };

    const roomChipsMap = this.userChipsMap.get(roomId)!;
    roomChipsMap.set(userId, newChips);

    this.logger.log(
      `[updateUserChips] roomId=${roomId}, userId=${userId}, ` +
      `silverChips: ${currentChips.silverChips} -> ${newChips.silverChips} (${silverChipChange >= 0 ? '+' : ''}${silverChipChange}), ` +
      `goldChips: ${currentChips.goldChips} -> ${newChips.goldChips} (${goldChipChange >= 0 ? '+' : ''}${goldChipChange}), ` +
      `funds: ${currentChips.funds} -> ${newChips.funds} (${fundsChange >= 0 ? '+' : ''}${fundsChange})`,
    );
  }

  /**
   * 모든 유저의 칩 정보를 가져옵니다.
   */
  getAllUserChips(
    roomId: string,
  ): Record<string, { silverChips: number; goldChips: number; funds: number }> {
    const roomChipsMap = this.userChipsMap.get(roomId);
    if (!roomChipsMap) {
      return {};
    }

    const result: Record<
      string,
      { silverChips: number; goldChips: number; funds: number }
    > = {};
    for (const [userId, chips] of roomChipsMap.entries()) {
      result[userId] = chips;
    }

    return result;
  }

  /**
   * 조커 카드를 판매합니다.
   */
  sellCard(
    roomId: string,
    userId: string,
    cardId: string,
    price: number,
  ): {
    success: boolean;
    message: string;
    soldCardName?: string;
  } {
    try {
      this.logger.log(
        `[sellCard] 판매 시도: roomId=${roomId}, userId=${userId}, cardId=${cardId}, price=${price}`,
      );

      // 1. 유저가 보유한 카드 목록에서 해당 카드 찾기
      const ownedCards = this.getUserOwnedCards(roomId, userId);
      const cardIndex = ownedCards.findIndex((card) => card.id === cardId);

      if (cardIndex === -1) {
        this.logger.warn(
          `[sellCard] 카드를 찾을 수 없음: userId=${userId}, cardId=${cardId}`,
        );
        return { success: false, message: '판매할 카드를 찾을 수 없습니다.' };
      }

      const soldCard = ownedCards[cardIndex];
      this.logger.log(
        `[sellCard] 판매할 카드 발견: cardName=${soldCard.name}, price=${price}`,
      );

      // 2. 카드 제거
      ownedCards.splice(cardIndex, 1);

      // 3. 칩 정보 업데이트 (판매 가격만큼 funds 증가)
      this.updateUserChips(roomId, userId, 0, 0, price);

      this.logger.log(
        `[sellCard] 판매 완료: userId=${userId}, cardId=${cardId}, price=${price}`,
      );

      return {
        success: true,
        message: '카드 판매가 완료되었습니다.',
        soldCardName: soldCard.name,
      };
    } catch (error) {
      this.logger.error(
        `[sellCard] Error in sellCard: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '카드 판매 중 오류가 발생했습니다.' };
    }
  }
}
