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
  getRandomShopCards,
  getCardById,
  isJokerCard,
  isTarotCard,
  // ALL_JOKER_CARDS,
  SpecialCard
} from './joker-cards.util';
import { UserService } from '../user/user.service';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  // === [유틸리티 함수] ===
  private getOrCreateMap<K, V>(map: Map<K, V>, key: K, defaultValue: () => V): V {
    if (!map.has(key)) map.set(key, defaultValue());
    return map.get(key)!;
  }
  private getOrCreateSet<K>(map: Map<K, Set<K>>, key: K): Set<K> {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key)!;
  }
  private resetRoomState(roomId: string) {
    this.gameStates.delete(roomId);
    this.handPlayMap.delete(roomId);
    this.nextRoundReadyMap.delete(roomId);
    this.gameReadyMap.delete(roomId);
    this.shopCardsMap.delete(roomId);
    this.reRollCardsMap.delete(roomId);
    this.userOwnedCardsMap.delete(roomId);
    this.userTarotCardsMap.delete(roomId);
    this.userFirstDeckCardsMap.delete(roomId);
    this.userChipsMap.delete(roomId);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) { }

  private gameStates: Map<
    string,
    {
      decks: Map<string, Card[]>; // userId별 덱
      hands: Map<string, Card[]>; // userId별 핸드
      round: number;
      phase: 'waiting' | 'playing' | 'shop';
      baseSilverSeedChip: number; // 방 생성 시 설정된 실버 시드 칩
      baseGoldSeedChip: number;   // 방 생성 시 설정된 골드 시드 칩
      currentSilverSeedChip: number; // 현재 라운드의 실버 시드 칩
      currentGoldSeedChip: number;   // 현재 라운드의 골드 시드 칩
    }
  > = new Map();

  private handPlayMap: Map<string, Map<string, Card[]>> = new Map(); // roomId -> userId -> hand

  // nextRound 준비 상태 관리용 Map
  private nextRoundReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // 게임 시작 준비 상태 관리용 Map
  private gameReadyMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

  // roomId별 샵 카드 5장 상태 관리 (모든 유저가 동일한 카드 풀을 사용하도록 Map<string, SpecialCard[]>로 변경)
  private shopCardsMap: Map<string, (SpecialCard)[]> =
    new Map();

  // roomId별 다시뽑기 카드 5장 상태 관리 (유저별로 관리)
  private reRollCardsMap: Map<string, Map<string, (SpecialCard)[]>> =
    new Map();

  // === [1] 유저별 ownedCards 저장용 Map 추가 ===
  private userOwnedCardsMap: Map<
    string,
    Map<string, (SpecialCard)[]>
  > = new Map();

  // 유저별 덱 수정 상태 저장 (타로 카드 사용 후)
  private userDeckModifications: Map<string, Map<string, Card[]>> = new Map(); // roomId -> userId -> modifiedDeck

  // 유저별 타로 카드 구매 기록 저장
  private userTarotCardsMap: Map<string, Map<string, (SpecialCard)[]>> = new Map(); // roomId -> userId -> tarotCards

  // 유저별 firstDeckCards 저장 (타로 카드 구매 시 클라이언트로 보낸 덱)
  private userFirstDeckCardsMap: Map<string, Map<string, Card[]>> = new Map(); // roomId -> userId -> firstDeckCards

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

  // === [3] 베팅 상태 관리용 Map 추가 ===
  private bettingMap: Map<string, Set<string>> = new Map(); // roomId -> Set<userId> (라운드당 1번 베팅한 유저들)

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
      this.logger.debug(`Creating Redis room: ${name}`);
      const roomId = uuidv4();
      const roomKey = `room:${roomId}`;
      const roomData = {
        roomId,
        name,
        maxPlayers,
        players: 1,
        status: 'waiting',
        createdAt: Date.now(),
        silverSeedChip: silverSeedChip || 0,
        goldSeedChip: goldSeedChip || 0,
        silverBettingChip: silverBettingChip || 0,
        goldBettingChip: goldBettingChip || 0,
      };
      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      await client.sadd('rooms', roomId);
      this.logger.debug(`Room created successfully: ${roomId}`);
      // === 메모리 상태도 초기화 ===
      const gameState = {
        decks: new Map<string, Card[]>(),
        hands: new Map<string, Card[]>(),
        round: 1,
        phase: 'waiting' as const,
        // 기본 seed 칩 (고정값)
        baseSilverSeedChip: silverSeedChip || 0,
        baseGoldSeedChip: goldSeedChip || 0,
        // 실시간 seed 칩 (변동값) - 초기값은 기본값과 동일
        currentSilverSeedChip: silverSeedChip || 0,
        currentGoldSeedChip: goldSeedChip || 0,
      };
      this.gameStates.set(roomId, gameState);
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
      this.logger.debug(`User ${userId} attempting to join room ${roomId}`);
      const client = this.redisService.getClient();
      const roomKey = `room:${roomId}`;
      const usersKey = `room:${roomId}:users`;
      const room = await client.hgetall(roomKey);
      if (!room || !room.roomId) throw new RoomNotFoundException(roomId);
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (isUserInRoom) throw new UserAlreadyInRoomException(userId, roomId);
      const currentPlayers = parseInt(room.players || '1', 10);
      const maxPlayers = parseInt(room.maxPlayers || '4', 10);
      if (currentPlayers >= maxPlayers) throw new RoomFullException(roomId);
      const newPlayers = currentPlayers + 1;
      await client.hset(roomKey, 'players', newPlayers);
      await client.sadd(usersKey, userId);
      await this.initializeUserChips(roomId, userId);
      return { ...room, players: newPlayers };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
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
              const seedChip = this.getBaseSilverSeedChip(roomId);
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
      this.logger.debug(`User ${userId} attempting to leave room ${roomId}`);
      const client = this.redisService.getClient();
      const roomKey = `room:${roomId}`;
      const usersKey = `room:${roomId}:users`;
      const room = await client.hgetall(roomKey);
      if (!room || !room.roomId) throw new RoomNotFoundException(roomId);
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (!isUserInRoom) throw new UserNotInRoomException(userId, roomId);
      const currentPlayers = parseInt(room.players || '1', 10);
      const newPlayers = currentPlayers - 1;
      await client.srem(usersKey, userId);
      if (newPlayers <= 0) {
        await this.deleteRoom(roomId);
        return { deleted: true };
      } else {
        await client.hset(roomKey, 'players', newPlayers);
        return { ...room, players: newPlayers };
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
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

  // async getRoomUsers(roomId: string): Promise<string[]> {
  //   try {
  //     this.logger.log(`Fetching users for room: ${roomId}`);
  //     const client = this.redisService.getClient();
  //     const usersKey = `room:${roomId}:users`;
  //     const users = await client.smembers(usersKey);
  //     this.logger.log(`Found ${users.length} users in room ${roomId}`);
  //     return users;
  //   } catch (error: unknown) {
  //     this.logger.error(
  //       `Error fetching users for room ${roomId}`,
  //       error instanceof Error ? error.stack : String(error),
  //     );
  //     throw new RedisConnectionException(
  //       error instanceof Error ? error.message : String(error),
  //     );
  //   }
  // }

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

  async startGame(roomId: string) {
    this.logger.debug(`[startGame] === 게임 시작 단계 진입: roomId=${roomId} ===`);
    this.handPlayMap.delete(roomId);
    this.nextRoundReadyMap.delete(roomId);
    this.bettingMap.delete(roomId); // 베팅 맵 초기화
    this.userTarotCardsMap.delete(roomId); // 유저가 구매한 타로 카드들 클리어
    this.userFirstDeckCardsMap.delete(roomId); // 유저의 firstDeckCards 클리어

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
      let userDeck: Card[];

      // 수정된 덱이 있는지 확인
      const roomDeckModifications = this.userDeckModifications.get(roomId);
      if (roomDeckModifications && roomDeckModifications.has(userId)) {
        // 수정된 덱이 있으면 그것을 사용
        userDeck = shuffle([...roomDeckModifications.get(userId)!]);
        roomDeckModifications.delete(userId); // 사용 후 삭제
        this.logger.log(`[startGame] userId=${userId}의 수정된 덱을 사용합니다.`);
      } else {
        // 일반적인 새 덱 생성
        userDeck = shuffle(createDeck());
        this.logger.log(`[startGame] userId=${userId}의 새 덱을 생성합니다.`);
      }

      decks.set(userId, userDeck);
      const userHand = userDeck.splice(0, 8);
      hands.set(userId, [...userHand]); // 복사본 저장
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
      baseSilverSeedChip: prevState?.baseSilverSeedChip ?? 0,
      baseGoldSeedChip: prevState?.baseGoldSeedChip ?? 0,
      currentSilverSeedChip: prevState?.currentSilverSeedChip ?? 0,
      currentGoldSeedChip: prevState?.currentGoldSeedChip ?? 0,
    });
    this.logger.log(
      `[startGame] === 게임 상태 저장 완료: roomId=${roomId}, round=${round} ===`,
    );
    // 샵 카드 5장 생성 (조커 3장, 행성 1장, 타로 1장)
    const shopCards = getRandomShopCards();
    this.shopCardsMap.set(roomId, [...shopCards]); // 복사본 저장
    this.logger.log(
      `[startGame] 공통 샵 카드 5장 생성 및 저장: roomId=${roomId}`,
    );

    // 새로운 라운드 시작 시 다시뽑기 카드 초기화
    this.reRollCardsMap.delete(roomId);
    this.logger.log(`[startGame] 다시뽑기 카드 초기화: roomId=${roomId}`);

    // 모든 유저의 칩을 현재 seed 칩만큼 차감
    const currentSilverSeedChip = this.getCurrentSilverSeedChip(roomId);
    const currentGoldSeedChip = this.getCurrentGoldSeedChip(roomId);

    const userChipsMap = this.userChipsMap.get(roomId);
    if (userChipsMap) {
      for (const [userId, chips] of userChipsMap.entries()) {
        // 현재 seed 칩만큼 차감하고 funds를 0으로 초기화
        const success = await this.updateUserChips(
          roomId,
          userId,
          -currentSilverSeedChip,
          -currentGoldSeedChip
        );

        if (success) {
          this.logger.log(
            `[startGame] 유저 칩 차감 완료: userId=${userId}, ` +
            `silverChip: -${currentSilverSeedChip}, goldChip: -${currentGoldSeedChip}, funds: -${chips.funds}`
          );
        } else {
          this.logger.warn(
            `[startGame] 유저 칩 차감 실패: userId=${userId}, ` +
            `currentSilverChips=${chips.silverChips}, currentGoldChips=${chips.goldChips}, ` +
            `requiredSilver=${currentSilverSeedChip}, requiredGold=${currentGoldSeedChip}`
          );
        }
      }
    }
  }

  getUserHand(roomId: string, userId: string): Card[] {
    const state = this.gameStates.get(roomId);
    if (!state) return [];
    const hand = state.hands.get(userId);
    return hand ? [...hand] : [];
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
    const newCards: Card[] = deck.splice(0, discarded.length);
    hand.push(...newCards);
    state.hands.set(userId, [...hand]); // 복사본 저장
    state.decks.set(userId, [...deck]); // 복사본 저장
    return { newHand: [...hand], discarded: [...discarded] };
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
      result.push({ userId, hand: [...hand] });
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
  getShopCards(roomId: string): string[] {
    const cards = this.shopCardsMap.get(roomId);
    return cards ? cards.map(card => card.id) : [];
  }

  // 다시뽑기 카드 5장 반환 (유저별로 관리, 같은 방의 다른 유저가 이미 있으면 복사)
  getReRollCards(roomId: string, userId: string): (SpecialCard)[] {
    // roomId에 대한 Map이 없으면 생성
    if (!this.reRollCardsMap.has(roomId)) {
      this.reRollCardsMap.set(roomId, new Map());
    }

    const roomReRollCards = this.reRollCardsMap.get(roomId)!;

    // 해당 유저의 카드가 이미 있으면 반환
    if (roomReRollCards.has(userId)) {
      return [...roomReRollCards.get(userId)!];
    }

    // 같은 방의 다른 유저가 이미 카드를 가지고 있는지 확인
    const existingUserCards = Array.from(roomReRollCards.values())[0];
    if (existingUserCards) {
      // 다른 유저의 카드를 복사해서 사용
      const copiedCards = existingUserCards.map(card => ({ ...card }));
      roomReRollCards.set(userId, copiedCards);
      return [...copiedCards];
    }

    // 아무도 카드를 가지고 있지 않으면 새로 생성
    const reRollCardsRaw: SpecialCard[] = getRandomShopCards();
    roomReRollCards.set(userId, reRollCardsRaw);
    return [...reRollCardsRaw];
  }

  // 카드 구매 처리
  async buyCard(
    roomId: string,
    userId: string,
    cardId: string,
  ): Promise<{
    success: boolean;
    message: string;
    cardName?: string;
    cardDescription?: string;
    cardSprite?: number;
    funds?: number;
    firstDeckCards?: Card[];
  }> {
    try {
      this.logger.log(
        `[buyCard] 구매 시도: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
      );

      // 1. cardId로 카드 데이터 조회
      const cardData = getCardById(cardId);
      if (!cardData) {
        this.logger.warn(
          `[buyCard] cardId=${cardId}인 카드를 찾을 수 없습니다.`,
        );
        return { success: false, message: '해당 카드를 찾을 수 없습니다.' };
      }

      // 2. 샵 카드 목록에서 해당 카드 찾기 (공통 풀) - 먼저 shopCardsMap에서 찾고, 없으면 reRollCardsMap에서 찾기
      const shopCards = this.shopCardsMap.get(roomId);
      let shopCard = shopCards?.find((card) => card.id === cardId);

      // shopCardsMap에서 찾지 못한 경우 reRollCardsMap에서 찾기
      if (!shopCard) {
        const roomReRollCards = this.reRollCardsMap.get(roomId);
        if (roomReRollCards && roomReRollCards.has(userId)) {
          const userCards = roomReRollCards.get(userId)!;
          shopCard = userCards.find((card) => card.id === cardId);
          if (shopCard) {
            this.logger.log(
              `[buyCard] cardId=${cardId}인 카드를 다시뽑기 카드에서 찾았습니다.`,
            );
          }
        }
      }

      if (!shopCard) {
        this.logger.warn(
          `[buyCard] cardId=${cardId}인 카드를 샵이나 다시뽑기 카드에서 찾을 수 없습니다.`,
        );
        return { success: false, message: '해당 카드를 찾을 수 없습니다.' };
      }
      // 3. 조커 카드인 경우에만 개수 제한 및 중복 구매 방지 체크
      if (isJokerCard(cardId)) {
        const ownedCardIds = this.getUserOwnedCards(roomId, userId);
        const ownedJokerCount = ownedCardIds.filter(id => isJokerCard(id)).length;
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
        if (ownedCardIds.includes(cardId)) {
          this.logger.warn(
            `[buyCard] userId=${userId}는 이미 cardId=${cardId} 조커를 보유 중. 중복 구매 불가.`,
          );
          return {
            success: false,
            message: '이미 보유한 조커 카드는 중복 구매할 수 없습니다.',
          };
        }
      }

      // 5. 유저의 funds 확인 및 구매 가능 여부 체크
      const userChips = await this.getUserChips(roomId, userId);
      if (userChips.funds < shopCard.price) {
        this.logger.warn(
          `[buyCard] userId=${userId}의 funds(${userChips.funds})가 카드 가격(${shopCard.price})보다 부족합니다.`,
        );
        return {
          success: false,
          message: `카드 구매에 필요한 funds가 부족합니다. (필요: ${shopCard.price}, 보유: ${userChips.funds})`,
        };
      }

      // 6. funds 차감
      await this.updateUserFunds(roomId, userId, -shopCard.price);
      this.logger.log(
        `[buyCard] userId=${userId}의 funds를 ${shopCard.price}만큼 차감했습니다. (${userChips.funds} -> ${userChips.funds - shopCard.price})`,
      );

      let firstDeckCards: Card[] | undefined;

      // 7. 카드 구매 처리
      if (isJokerCard(cardId)) {
        // 조커 카드 처리
        if (!this.userOwnedCardsMap.has(roomId)) {
          this.userOwnedCardsMap.set(roomId, new Map());
        }
        const userCardsMap = this.userOwnedCardsMap.get(roomId)!;
        if (!userCardsMap.has(userId)) {
          userCardsMap.set(userId, []);
        }
        userCardsMap.get(userId)!.push(shopCard);
        this.logger.log(`[buyCard] userId=${userId}의 조커 카드 ${cardId}를 userOwnedCardsMap에 추가했습니다.`);
      } else if (isTarotCard(cardId)) {
        // 타로 카드 처리 - 덱 수정 로직
        this.logger.log(`[buyCard] userId=${userId}의 타로 카드 ${cardId}를 처리합니다.`);

        // 타로 카드를 userTarotCardsMap에 저장
        if (!this.userTarotCardsMap.has(roomId)) {
          this.userTarotCardsMap.set(roomId, new Map());
        }
        const userTarotCardsMap = this.userTarotCardsMap.get(roomId)!;
        if (!userTarotCardsMap.has(userId)) {
          userTarotCardsMap.set(userId, []);
        }
        userTarotCardsMap.get(userId)!.push(shopCard);
        this.logger.log(`[buyCard] userId=${userId}의 타로 카드 ${cardId}를 userTarotCardsMap에 추가했습니다.`);

        // 유저의 수정된 덱이 있는지 확인
        let modifiedDeck: Card[];
        const roomDeckModifications = this.userDeckModifications.get(roomId);

        if (roomDeckModifications && roomDeckModifications.has(userId)) {
          // 이미 수정된 덱이 있으면 그것을 사용
          modifiedDeck = [...roomDeckModifications.get(userId)!];
          this.logger.log(`[buyCard] userId=${userId}의 기존 수정된 덱을 사용합니다.`);
        } else {
          // 수정된 덱이 없으면 새로 생성
          modifiedDeck = shuffle(createDeck());
          this.logger.log(`[buyCard] userId=${userId}의 새 덱을 생성합니다.`);
        }

        // 수정된 덱을 저장
        if (!this.userDeckModifications.has(roomId)) {
          this.userDeckModifications.set(roomId, new Map());
        }
        const roomDeckModificationsForSave = this.userDeckModifications.get(roomId)!;
        roomDeckModificationsForSave.set(userId, modifiedDeck);

        this.logger.log(`[buyCard] userId=${userId}의 덱이 수정되어 저장되었습니다.`);

        // 수정된 덱의 앞 8장 반환
        firstDeckCards = modifiedDeck.slice(0, 8);

        // firstDeckCards를 서버에도 저장
        if (!this.userFirstDeckCardsMap.has(roomId)) {
          this.userFirstDeckCardsMap.set(roomId, new Map());
        }
        const userFirstDeckCardsMap = this.userFirstDeckCardsMap.get(roomId)!;
        userFirstDeckCardsMap.set(userId, [...firstDeckCards]);
        this.logger.log(`[buyCard] userId=${userId}의 firstDeckCards를 userFirstDeckCardsMap에 저장했습니다.`);

      } else {
        this.logger.log(`[buyCard] userId=${userId}의 ${cardId}는 조커 카드가 아니므로 userOwnedCardsMap에 추가하지 않습니다. (나중에 처리 예정)`);
      }

      // 8. 업데이트된 funds 가져오기
      const updatedUserChips = await this.getUserChips(roomId, userId);

      return {
        success: true,
        message: '카드 구매가 완료되었습니다.',
        cardName: shopCard.name,
        cardDescription: shopCard.description,
        cardSprite: shopCard.sprite,
        funds: updatedUserChips.funds,
        firstDeckCards: firstDeckCards, // 수정된 덱의 앞 8장
      };
    } catch (error) {
      this.logger.error(
        `[buyCard] Error in buyCard: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '카드 구매 중 오류가 발생했습니다.' };
    }
  }

  getUserOwnedCards(
    roomId: string,
    userId: string,
  ): string[] {
    const cards = this.userOwnedCardsMap.get(roomId)?.get(userId) ?? [];
    return cards.map(card => card.id);
  }

  getRound(roomId: string): number {
    const state = this.gameStates.get(roomId);
    return state?.round ?? 1;
  }

  // === 기본 seed 칩 (고정값) ===
  getBaseSilverSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.baseSilverSeedChip ?? 0;
    this.logger.log(
      `[getBaseSilverSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, baseSilverSeedChip=${state?.baseSilverSeedChip}, result=${result}`,
    );
    return result;
  }

  getBaseGoldSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.baseGoldSeedChip ?? 0;
    this.logger.log(
      `[getBaseGoldSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, baseGoldSeedChip=${state?.baseGoldSeedChip}, result=${result}`,
    );
    return result;
  }

  // === 실시간 seed 칩 (변동값) ===
  getCurrentSilverSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.currentSilverSeedChip ?? 0;
    this.logger.log(
      `[getCurrentSilverSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, currentSilverSeedChip=${state?.currentSilverSeedChip}, result=${result}`,
    );
    return result;
  }

  getCurrentGoldSeedChip(roomId: string): number {
    const state = this.gameStates.get(roomId);
    const result = state?.currentGoldSeedChip ?? 0;
    this.logger.log(
      `[getCurrentGoldSeedChip] roomId=${roomId}, state=${state ? 'exists' : 'null'}, currentGoldSeedChip=${state?.currentGoldSeedChip}, result=${result}`,
    );
    return result;
  }

  // === 실시간 seed 칩 업데이트 ===
  updateCurrentSilverSeedChip(roomId: string, amount: number): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      state.currentSilverSeedChip = Math.max(0, state.currentSilverSeedChip + amount);
      this.logger.log(
        `[updateCurrentSilverSeedChip] roomId=${roomId}, currentSilverSeedChip: ${state.currentSilverSeedChip - amount} -> ${state.currentSilverSeedChip} (${amount >= 0 ? '+' : ''}${amount})`
      );
    }
  }

  updateCurrentGoldSeedChip(roomId: string, amount: number): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      state.currentGoldSeedChip = Math.max(0, state.currentGoldSeedChip + amount);
      this.logger.log(
        `[updateCurrentGoldSeedChip] roomId=${roomId}, currentGoldSeedChip: ${state.currentGoldSeedChip - amount} -> ${state.currentGoldSeedChip} (${amount >= 0 ? '+' : ''}${amount})`
      );
    }
  }

  // === 라운드 시작 시 실시간 seed 칩을 기본값으로 리셋 ===
  resetCurrentSeedChips(roomId: string): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      const oldSilver = state.currentSilverSeedChip;
      const oldGold = state.currentGoldSeedChip;
      state.currentSilverSeedChip = state.baseSilverSeedChip;
      state.currentGoldSeedChip = state.baseGoldSeedChip;
      this.logger.log(
        `[resetCurrentSeedChips] roomId=${roomId}, ` +
        `silver: ${oldSilver} -> ${state.currentSilverSeedChip}, ` +
        `gold: ${oldGold} -> ${state.currentGoldSeedChip}`
      );
    }
  }

  // === [4] 유저별 칩 정보 관리 메서드들 ===

  /**
   * 유저의 칩 정보를 초기화합니다. (DB에서 실제 칩 정보를 가져와서 메모리에 저장)
   */
  async initializeUserChips(roomId: string, userId: string): Promise<void> {
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
    const roomChipsMap = this.getOrCreateMap(this.userChipsMap, roomId, () => new Map());
    roomChipsMap.set(userId, {
      silverChips: dbChips.silverChip,
      goldChips: dbChips.goldChip,
      funds: 0,
    });
  }

  /**
   * 유저의 칩 정보를 가져옵니다. (메모리에 없으면 DB에서 조회 후 메모리에 저장)
   */
  async getUserChips(
    roomId: string,
    userId: string,
  ): Promise<{ silverChips: number; goldChips: number; funds: number }> {
    const roomChipsMap = this.userChipsMap.get(roomId);
    if (roomChipsMap?.has(userId)) return roomChipsMap.get(userId)!;
    await this.initializeUserChips(roomId, userId);
    return this.userChipsMap.get(roomId)!.get(userId)!;
  }

  /**
   * 유저의 칩 정보를 업데이트합니다.
   */
  async updateUserChips(
    roomId: string,
    userId: string,
    silverChipChange: number = 0,
    goldChipChange: number = 0,
  ): Promise<boolean> {
    const currentChips = await this.getUserChips(roomId, userId);

    // 차감하려는 경우 칩이 부족한지 확인
    if (silverChipChange < 0 && currentChips.silverChips + silverChipChange < 0) {
      this.logger.warn(
        `[updateUserChips] 실버 칩 부족: userId=${userId}, current=${currentChips.silverChips}, required=${Math.abs(silverChipChange)}`
      );
      return false;
    }

    if (goldChipChange < 0 && currentChips.goldChips + goldChipChange < 0) {
      this.logger.warn(
        `[updateUserChips] 골드 칩 부족: userId=${userId}, current=${currentChips.goldChips}, required=${Math.abs(goldChipChange)}`
      );
      return false;
    }

    const newChips = {
      silverChips: Math.max(0, currentChips.silverChips + silverChipChange),
      goldChips: Math.max(0, currentChips.goldChips + goldChipChange),
      funds: currentChips.funds, // funds는 변경하지 않음
    };

    const roomChipsMap = this.userChipsMap.get(roomId)!;
    roomChipsMap.set(userId, newChips);

    this.logger.log(
      `[updateUserChips] roomId=${roomId}, userId=${userId}, ` +
      `silverChips: ${currentChips.silverChips} -> ${newChips.silverChips} (${silverChipChange >= 0 ? '+' : ''}${silverChipChange}), ` +
      `goldChips: ${currentChips.goldChips} -> ${newChips.goldChips} (${goldChipChange >= 0 ? '+' : ''}${goldChipChange})`
    );

    return true;
  }

  async updateUserFunds(
    roomId: string,
    userId: string,
    fundsChange: number = 0,
  ): Promise<boolean> {
    const currentChips = await this.getUserChips(roomId, userId);

    // 차감하려는 경우 funds가 부족한지 확인
    if (fundsChange < 0 && currentChips.funds + fundsChange < 0) {
      this.logger.warn(
        `[updateUserFunds] funds 부족: userId=${userId}, current=${currentChips.funds}, required=${Math.abs(fundsChange)}`
      );
      return false;
    }

    const newChips = {
      silverChips: currentChips.silverChips, // 칩은 변경하지 않음
      goldChips: currentChips.goldChips, // 칩은 변경하지 않음
      funds: Math.max(0, currentChips.funds + fundsChange),
    };

    const roomChipsMap = this.userChipsMap.get(roomId)!;
    roomChipsMap.set(userId, newChips);

    this.logger.log(
      `[updateUserFunds] roomId=${roomId}, userId=${userId}, ` +
      `funds: ${currentChips.funds} -> ${newChips.funds} (${fundsChange >= 0 ? '+' : ''}${fundsChange})`
    );

    return true;
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
  async sellCard(
    roomId: string,
    userId: string,
    cardId: string,
  ): Promise<{
    success: boolean;
    message: string;
    soldCardId?: string;
    funds?: number;
  }> {
    try {
      this.logger.log(
        `[sellCard] 판매 시도: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
      );

      // 1. 유저가 보유한 카드 목록에서 해당 카드 찾기
      const ownedCardIds = this.getUserOwnedCards(roomId, userId);
      const cardIndex = ownedCardIds.indexOf(cardId);

      if (cardIndex === -1) {
        this.logger.warn(
          `[sellCard] 카드를 찾을 수 없음: userId=${userId}, cardId=${cardId}`,
        );
        return { success: false, message: '판매할 카드를 찾을 수 없습니다.' };
      }

      // 2. 실제 카드 객체 가져오기 (userOwnedCardsMap에서)
      const userCardsMap = this.userOwnedCardsMap.get(roomId)?.get(userId) ?? [];
      const soldCard = userCardsMap[cardIndex];
      const cardPrice = soldCard.price;
      this.logger.log(
        `[sellCard] 판매할 카드 발견: cardName=${soldCard.name}, price=${cardPrice}`,
      );

      // 3. 카드 제거
      userCardsMap.splice(cardIndex, 1);

      // 4. funds 증가 (판매 가격만큼)
      await this.updateUserFunds(roomId, userId, cardPrice);
      this.logger.log(
        `[sellCard] userId=${userId}의 funds를 ${cardPrice}만큼 증가했습니다.`,
      );

      // 5. 업데이트된 funds 가져오기
      const updatedUserChips = await this.getUserChips(roomId, userId);

      this.logger.log(
        `[sellCard] 판매 완료: userId=${userId}, cardId=${cardId}, price=${cardPrice}`,
      );

      return {
        success: true,
        message: '카드 판매가 완료되었습니다.',
        soldCardId: soldCard.id,
        funds: updatedUserChips.funds,
      };
    } catch (error) {
      this.logger.error(
        `[sellCard] Error in sellCard: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '카드 판매 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 조커 카드 순서를 재정렬합니다.
   */
  async reorderJokers(
    roomId: string,
    userId: string,
    jokerIds: string[],
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    jokerIds?: string[];
  }> {
    try {
      this.logger.log(
        `[reorderJokers] 순서 변경 시도: roomId=${roomId}, userId=${userId}, jokerIds=${JSON.stringify(jokerIds)}`,
      );

      // 1. 유저가 보유한 카드 목록 가져오기
      const userCardsMap = this.userOwnedCardsMap.get(roomId)?.get(userId);
      if (!userCardsMap) {
        this.logger.warn(
          `[reorderJokers] 유저의 조커 카드를 찾을 수 없음: userId=${userId}`,
        );
        return { success: false, message: '조커 카드를 찾을 수 없습니다.' };
      }

      // 2. 현재 보유한 조커 ID 목록
      const currentJokerIds = userCardsMap.map(card => card.id);

      // 3. 요청된 조커 ID들이 모두 보유한 조커인지 확인
      for (const jokerId of jokerIds) {
        if (!currentJokerIds.includes(jokerId)) {
          this.logger.warn(
            `[reorderJokers] 보유하지 않은 조커 ID: userId=${userId}, jokerId=${jokerId}`,
          );
          return { success: false, message: '보유하지 않은 조커가 포함되어 있습니다.' };
        }
      }

      // 4. 조커 개수가 일치하는지 확인
      if (jokerIds.length !== currentJokerIds.length) {
        this.logger.warn(
          `[reorderJokers] 조커 개수 불일치: userId=${userId}, requested=${jokerIds.length}, owned=${currentJokerIds.length}`,
        );
        return { success: false, message: '조커 개수가 일치하지 않습니다.' };
      }

      // 5. 새로운 순서로 조커 배열 재구성
      const reorderedJokers: SpecialCard[] = [];
      for (const jokerId of jokerIds) {
        const joker = userCardsMap.find(card => card.id === jokerId);
        if (joker) {
          reorderedJokers.push(joker);
        }
      }

      // 6. 기존 배열을 새로운 순서로 교체
      userCardsMap.splice(0, userCardsMap.length, ...reorderedJokers);

      this.logger.log(
        `[reorderJokers] 순서 변경 완료: userId=${userId}, newOrder=${JSON.stringify(reorderedJokers.map(card => card.id))}`,
      );

      return {
        success: true,
        message: '조커 순서가 변경되었습니다.',
        userId: userId,
        jokerIds: reorderedJokers.map(card => card.id),
      };
    } catch (error) {
      this.logger.error(
        `[reorderJokers] Error in reorderJokers: roomId=${roomId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '조커 순서 변경 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 라운드 종료 처리를 합니다.
   */
  async handleRoundEnd(roomId: string) {
    const round = this.getRound(roomId) + 1;

    const baseSilverSeedChip = this.getBaseSilverSeedChip(roomId);
    const baseGoldSeedChip = this.getBaseGoldSeedChip(roomId);

    if (round > 5) {
      // 게임 종료 - 모든 상태 초기화
      this.gameStates.set(roomId, {
        decks: new Map(),
        hands: new Map(),
        round: 1,
        phase: 'waiting',
        baseSilverSeedChip: baseSilverSeedChip,
        baseGoldSeedChip: baseGoldSeedChip,
        currentSilverSeedChip: baseSilverSeedChip,
        currentGoldSeedChip: baseGoldSeedChip,
      });

      // 모든 게임 관련 Map 초기화
      this.handPlayMap.delete(roomId);
      this.nextRoundReadyMap.delete(roomId);
      this.shopCardsMap.delete(roomId);
      this.gameReadyMap.delete(roomId);
      this.userOwnedCardsMap.delete(roomId);

      // 5라운드가 넘었을 때 모든 유저의 funds를 0으로 초기화
      try {
        const roomChipsMap = this.userChipsMap.get(roomId);
        if (roomChipsMap) {
          const userIds = Array.from(roomChipsMap.keys());
          this.logger.log(`[handleRoundEnd] 5라운드 종료 - 모든 유저 funds 초기화: roomId=${roomId}, users=${userIds.join(',')}`);

          for (const userId of userIds) {
            const currentChips = roomChipsMap.get(userId);
            if (currentChips) {
              const fundsToDeduct = -currentChips.funds; // 현재 funds 값을 음수로 만들어서 0으로 초기화
              await this.updateUserFunds(roomId, userId, fundsToDeduct);
              this.logger.log(`[handleRoundEnd] 유저 funds 초기화 완료: userId=${userId}, 기존 funds=${currentChips.funds}`);
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `[handleRoundEnd] 유저 funds 초기화 중 오류 발생: roomId=${roomId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    } else {
      // 다음 라운드로 진행
      const prevState = this.gameStates.get(roomId);
      if (prevState) {
        this.gameStates.set(roomId, {
          ...prevState,
          round,
        });
      }
    }
  }

  /**
   * 베팅을 처리합니다.
   */
  async handleBetting(roomId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    currentSilverSeed?: number;
    currentGoldSeed?: number;
  }> {
    try {
      this.logger.log(
        `[handleBetting] 베팅 시도: roomId=${roomId}, userId=${userId}`,
      );

      // 1. 이미 베팅했는지 확인
      const roomBettingSet = this.bettingMap.get(roomId);
      if (roomBettingSet?.has(userId)) {
        this.logger.warn(
          `[handleBetting] 이미 베팅한 유저: roomId=${roomId}, userId=${userId}`,
        );
        return {
          success: false,
          message: '이미 베팅했습니다. 라운드당 1번만 베팅할 수 있습니다.'
        };
      }

      // 2. 기본 seed 칩 값 가져오기
      const baseSilverSeedChip = this.getBaseSilverSeedChip(roomId);
      const baseGoldSeedChip = this.getBaseGoldSeedChip(roomId);

      // 3. 현재 seed 칩 증가
      this.updateCurrentSilverSeedChip(roomId, baseSilverSeedChip);
      this.updateCurrentGoldSeedChip(roomId, baseGoldSeedChip);

      // 4. 베팅 상태 기록
      if (!this.bettingMap.has(roomId)) {
        this.bettingMap.set(roomId, new Set());
      }
      this.bettingMap.get(roomId)!.add(userId);

      // 5. 업데이트된 현재 seed 칩 값 가져오기
      const currentSilverSeedChip = this.getCurrentSilverSeedChip(roomId);
      const currentGoldSeedChip = this.getCurrentGoldSeedChip(roomId);

      this.logger.log(
        `[handleBetting] 베팅 완료: roomId=${roomId}, userId=${userId}, ` +
        `baseSilverSeedChip=${baseSilverSeedChip}, currentSilverSeedChip=${currentSilverSeedChip}, ` +
        `baseGoldSeedChip=${baseGoldSeedChip}, currentGoldSeedChip=${currentGoldSeedChip}`,
      );

      return {
        success: true,
        message: '베팅이 완료되었습니다.',
        currentSilverSeed: currentSilverSeedChip,
        currentGoldSeed: currentGoldSeedChip,
      };
    } catch (error) {
      this.logger.error(
        `[handleBetting] Error in handleBetting: roomId=${roomId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: '베팅 처리 중 오류가 발생했습니다.' };
    }
  }
}
