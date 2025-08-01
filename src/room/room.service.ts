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
import { SpecialCard } from './special-card-manager.service';
import { UserService } from '../user/user.service';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { SpecialCardManagerService } from './special-card-manager.service';
import { CardType, PokerHandResult, PokerHand } from './poker-types';

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
    this.userDeckModifications.delete(roomId);
    this.userTarotCardsMap.delete(roomId);
    this.userFirstDeckCardsMap.delete(roomId);
    this.userChipsMap.delete(roomId);
    this.bettingMap.delete(roomId);
    this.usedJokerCardIdsMap.delete(roomId);
    this.discardCountMap.delete(roomId);
    this.resetSeedMoneyPayments(roomId);
  }

  // 카드 무늬 변환 헬퍼 메서드
  // convertSuitToCardType 메서드 제거 - 이제 Card.suit가 이미 CardType enum

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly paytableService: PaytableService,
    private readonly handEvaluatorService: HandEvaluatorService,
    private readonly specialCardManagerService: SpecialCardManagerService,
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

  // === [3] roomId별 이미 등장한 조커카드 id Set 추가 ===
  private usedJokerCardIdsMap: Map<string, Set<string>> = new Map(); // roomId -> Set<조커카드id>

  // === [4] roomId별 유저별 버리기 횟수 관리 ===
  private discardCountMap: Map<string, Map<string, number>> = new Map(); // roomId -> userId -> count

  // === [5] 유저별 게임 참여 상태 관리 ===
  private userGameStatusMap: Map<string, Map<string, 'active' | 'inactive' | 'afk'>> = new Map(); // roomId -> userId -> status

  // === [6] 유저별 게임 상태 관리 ===
  private userStatusMap: Map<string, Map<string, 'waiting' | 'playing'>> = new Map(); // roomId -> userId -> status

  // 유저별 실제 시드머니 납부 금액 저장
  private readonly userSeedMoneyPayments: Map<string, Map<string, {
    silverPayment: number;  // 실제 납부한 실버칩
    goldPayment: number;    // 실제 납부한 골드칩
  }>> = new Map();

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

      // 유저 상태를 waiting으로 초기화
      this.setUserStatus(roomId, userId, 'waiting');

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

      // 유저 상태 정리
      const userStatuses = this.userStatusMap.get(roomId);
      if (userStatuses) {
        userStatuses.delete(userId);
      }

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

    // 라운드에 따라 참여할 유저 결정
    const prevState = this.gameStates.get(roomId);
    const round = prevState?.round ?? 1;

    let participatingUserIds: string[];

    if (round === 1) {
      // 1라운드: 모든 유저 참여
      participatingUserIds = [...userIds];
      this.logger.log(`[startGame] 1라운드 - 모든 유저 참여: ${participatingUserIds.join(',')}`);
    } else {
      // 2라운드 이상: playing 상태인 유저만 참여
      participatingUserIds = userIds.filter(uid => this.isUserPlaying(roomId, uid));
      this.logger.log(`[startGame] ${round}라운드 - playing 상태 유저만 참여: ${participatingUserIds.join(',')}`);
    }

    // userId별로 덱 셔플 (참여하는 유저만)
    const decks = new Map<string, Card[]>();
    const hands = new Map<string, Card[]>();
    for (const userId of participatingUserIds) {
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

    // 라운드에 따라 유저 상태 변경
    if (round === 1) {
      // 1라운드: 모든 유저를 playing으로 변경
      this.setAllUsersToPlaying(roomId, userIds);
      this.logger.log(`[startGame] 1라운드 - 모든 유저를 playing 상태로 변경`);
    } else {
      // 2라운드 이상: playing 상태인 유저만 유지, 나머지는 waiting 유지
      this.logger.log(`[startGame] ${round}라운드 - playing 상태 유저만 게임 참여, 나머지는 waiting 상태 유지`);
    }
    // 1라운드 시작 시 사용된 조커카드 추적 초기화 및 paytable 데이터 초기화
    if (round === 1) {
      this.usedJokerCardIdsMap.delete(roomId);
      this.paytableService.resetAllUserData();
      this.logger.log(`[startGame] 1라운드 시작 - 사용된 조커카드 추적 초기화 및 paytable 데이터 초기화: roomId=${roomId}`);
    }

    // 샵 카드 5장 생성 (조커 3장, 행성 1장, 타로 1장) - 이미 등장한 조커카드 제외
    const usedJokerSet = this.usedJokerCardIdsMap.get(roomId) ?? new Set();
    const shopCards = this.specialCardManagerService.getRandomShopCards(5, usedJokerSet);
    this.shopCardsMap.set(roomId, [...shopCards]); // 복사본 저장

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    shopCards.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        usedJokerSet.add(card.id);
        this.logger.log(`[startGame] 조커카드 ${card.id}를 usedJokerSet에 추가: roomId=${roomId}`);
      }
    });
    this.usedJokerCardIdsMap.set(roomId, usedJokerSet);

    this.logger.log(
      `[startGame] 공통 샵 카드 5장 생성 및 저장: roomId=${roomId}, 사용된 조커카드 수: ${usedJokerSet.size}`,
    );

    // 새로운 라운드 시작 시 다시뽑기 카드 초기화
    this.reRollCardsMap.delete(roomId);
    this.logger.log(`[startGame] 다시뽑기 카드 초기화: roomId=${roomId}`);

    // 새로운 라운드 시작 시 버리기 횟수 초기화
    this.resetDiscardCounts(roomId);
    this.logger.log(`[startGame] 버리기 횟수 초기화: roomId=${roomId}`);

    // 주의: usedJokerCardIdsMap은 초기화하지 않음 (1~5라운드 동안 조커카드 중복 방지)
    this.logger.log(`[startGame] 사용된 조커카드 추적 유지: roomId=${roomId}, 개수: ${this.usedJokerCardIdsMap.get(roomId)?.size ?? 0}`);

    // 모든 유저의 칩을 현재 seed 칩만큼 차감
    const currentSilverSeedChip = this.getCurrentSilverSeedChip(roomId);
    const currentGoldSeedChip = this.getCurrentGoldSeedChip(roomId);

    // 유저별 시드머니 납부 처리
    for (const uid of userIds) {
      const chips = await this.getUserChips(roomId, uid);

      // 실제 납부 가능한 금액 계산 (가진 돈이 부족하면 가진 돈만큼만)
      const actualSilverPayment = Math.min(currentSilverSeedChip, chips.silverChips);
      const actualGoldPayment = Math.min(currentGoldSeedChip, chips.goldChips);

      // 시드머니 납부 기록 저장
      if (!this.userSeedMoneyPayments.has(roomId)) {
        this.userSeedMoneyPayments.set(roomId, new Map());
      }
      this.userSeedMoneyPayments.get(roomId)!.set(uid, {
        silverPayment: actualSilverPayment,
        goldPayment: actualGoldPayment
      });

      // 현재 seed 칩만큼 차감하고 funds를 0으로 초기화
      await this.updateUserChips(roomId, uid, -actualSilverPayment, -actualGoldPayment);

      if (round === 1) {
        await this.updateUserFunds(roomId, uid, -chips.funds);
      }

      this.logger.log(
        `[startGame] ${uid} 시드머니 납부: ` +
        `요구(실버=${currentSilverSeedChip}, 골드=${currentGoldSeedChip}), ` +
        `실제납부(실버=${actualSilverPayment}, 골드=${actualGoldPayment}), ` +
        `자금=${chips.funds}`
      );
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
   * 카드를 버리고 새 카드를 뽑습니다.
   * @param roomId
   * @param userId
   * @param cards 버릴 카드의 suit/rank 배열
   * @returns { newHand, discarded, remainingDiscards }
   */
  discardAndDraw(
    roomId: string,
    userId: string,
    cards: Card[],
  ): { newHand: Card[]; discarded: Card[]; remainingDiscards: number } {
    // 버리기 횟수 증가
    const newCount = this.incrementUserDiscardCount(roomId, userId);
    const remainingDiscards = this.getRemainingDiscards(roomId, userId);

    const state = this.gameStates.get(roomId);
    if (!state) throw new Error('Room state not found');
    const hand = state.hands.get(userId);
    if (!hand) throw new Error('User hand not found');
    const deck = state.decks.get(userId);
    if (!deck) throw new Error('User deck not found');
    const discarded: Card[] = [];
    for (const cardInfo of cards) {
      const idx = hand.findIndex(
        (c) => c.id === cardInfo.id,
      );
      if (idx !== -1) {
        discarded.push(hand.splice(idx, 1)[0]);
      }
    }
    const newCards: Card[] = deck.splice(0, discarded.length);
    hand.push(...newCards);
    state.hands.set(userId, [...hand]); // 복사본 저장
    state.decks.set(userId, [...deck]); // 복사본 저장

    this.logger.log(`[discardAndDraw] userId=${userId}, roomId=${roomId}, discarded=${discarded.length}, newCount=${newCount}, remainingDiscards=${remainingDiscards}`);

    return { newHand: [...hand], discarded: [...discarded], remainingDiscards };
  }

  handPlayReady(roomId: string, userId: string, playCards: Card[]): void {
    if (!this.handPlayMap.has(roomId)) {
      this.handPlayMap.set(roomId, new Map());
    }
    this.handPlayMap.get(roomId)!.set(userId, playCards);
    this.logger.log(
      `[handPlayReady] userId=${userId}, roomId=${roomId}, playCards=${JSON.stringify(playCards)}`,
    );
  }

  canRevealHandPlay(roomId: string, userIds: string[]): boolean {
    const handMap = this.handPlayMap.get(roomId);
    if (!handMap) return false;

    // playing 상태인 유저들만 필터링
    const playingUsers = userIds.filter(uid => this.isUserPlaying(roomId, uid));

    // playing 상태인 유저가 없으면 false
    if (playingUsers.length === 0) {
      this.logger.log(
        `[canRevealHandPlay] roomId=${roomId}, no playing users, allReady=false`,
      );
      return false;
    }

    // playing 상태인 유저들이 모두 handPlay를 완료했는지 확인
    const allReady = playingUsers.every((uid) => handMap.has(uid));

    this.logger.log(
      `[canRevealHandPlay] roomId=${roomId}, allReady=${allReady}, playingUsers=${playingUsers.join(',')}, submitted=${handMap ? Array.from(handMap.keys()).join(',') : ''}`,
    );
    return allReady;
  }

  getAllHandPlayCards(roomId: string): { userId: string; playCards: Card[] }[] {
    const handMap = this.handPlayMap.get(roomId);
    if (!handMap) return [];
    const result: { userId: string; playCards: Card[] }[] = [];
    for (const [userId, playCards] of handMap.entries()) {
      result.push({ userId, playCards: [...playCards] });
    }
    this.logger.log(
      `[getAllHandPlayCards] roomId=${roomId}, result=${JSON.stringify(result)}`,
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

    // playing 상태인 유저들만 필터링
    const playingUsers = userIds.filter(uid => this.isUserPlaying(roomId, uid));

    // playing 상태인 유저가 없으면 false
    if (playingUsers.length === 0) {
      this.logger.log(
        `[canStartNextRound] roomId=${roomId}, no playing users, allReady=false`,
      );
      return false;
    }

    // playing 상태인 유저들이 모두 nextRound 준비를 완료했는지 확인
    const allReady = playingUsers.every((uid) => readySet.has(uid));

    this.logger.log(
      `[canStartNextRound] roomId=${roomId}, allReady=${allReady}, playingUsers=${playingUsers.join(',')}, ready=${readySet ? Array.from(readySet).join(',') : ''}`,
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
    const usedJokerSet = this.usedJokerCardIdsMap.get(roomId) ?? new Set();
    const reRollCardsRaw: SpecialCard[] = this.specialCardManagerService.getRandomShopCards(5, usedJokerSet);

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    reRollCardsRaw.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        usedJokerSet.add(card.id);
        this.logger.log(`[getReRollCards] 조커카드 ${card.id}를 usedJokerSet에 추가: roomId=${roomId}, userId=${userId}`);
      }
    });
    this.usedJokerCardIdsMap.set(roomId, usedJokerSet);

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
    planetCardIds?: string[];
  }> {
    try {
      this.logger.log(
        `[buyCard] 구매 시도: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
      );

      // 1. cardId로 카드 데이터 조회
      const cardInfo = this.specialCardManagerService.getCardById(cardId);
      if (!cardInfo) {
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
      if (this.specialCardManagerService.isJokerCard(cardId)) {
        const ownedCardIds = this.getUserOwnedCards(roomId, userId);
        const ownedJokerCount = ownedCardIds.filter(id => this.specialCardManagerService.isJokerCard(id)).length;
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
      } else if (this.specialCardManagerService.isTarotCard(cardId)) {
        // 타로 카드 처리
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
      let planetCardIds: string[] | undefined;

      // 7. 카드 구매 처리
      if (this.specialCardManagerService.isJokerCard(cardId)) {
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
      } else if (this.specialCardManagerService.isTarotCard(cardId)) {
        // 타로 카드 처리 - 덱 수정 로직
        this.logger.log(`[buyCard] userId=${userId}의 타로 카드 ${cardId}를 처리합니다.`);

        // tarot_10 특별 처리
        if (cardId === 'tarot_10') {
          this.logger.log(`[buyCard] tarot_10 특별 처리: 행성 카드 2장 생성`);

          // 행성 카드 2장 뽑기
          const planetCards = this.specialCardManagerService.getRandomPlanetCards(2);
          planetCardIds = planetCards ? planetCards.map(card => card.id) : [];

          this.logger.log(`[buyCard] 생성된 행성 카드: ${planetCardIds.join(', ')}`);

        } else {
          // 기존 타로 카드 처리 로직
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
        }

      } else if (this.specialCardManagerService.isPlanetCard(cardId)) {
        // 행성 카드 처리 - paytable에 enhanceChips, enhanceMul 적용
        this.logger.log(`[buyCard] userId=${userId}의 행성 카드 ${cardId} 효과를 적용합니다.`);

        const cardData = this.specialCardManagerService.getCardById(cardId);
        if (cardData && cardData.pokerHand && cardData.enhanceChips !== undefined && cardData.enhanceMul !== undefined) {
          // paytable에 행성 카드 효과 적용
          this.paytableService.enhanceLevel(userId, cardData.pokerHand);
          this.paytableService.enhanceChips(userId, cardData.pokerHand, cardData.enhanceChips);
          this.paytableService.enhanceMultiplier(userId, cardData.pokerHand, cardData.enhanceMul);

          this.logger.log(`[buyCard] 행성 카드 ${cardId} 효과 적용 완료: ${cardData.pokerHand} - 칩스 +${cardData.enhanceChips}, 배수 +${cardData.enhanceMul}`);
        } else {
          this.logger.warn(`[buyCard] 행성 카드 ${cardId}의 데이터가 올바르지 않습니다.`);
        }
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
        planetCardIds: cardId === 'tarot_10' ? planetCardIds : undefined, // tarot_10용 행성 카드 ID 리스트
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
  async handleRoundEnd(roomId: string, userIds: string[]) {
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

      // 5라운드가 끝났으면 모든 유저 상태를 waiting으로 변경
      this.setAllUsersToWaiting(roomId, userIds);
      this.logger.log(`[processHandPlayResult] 5라운드 완료 - 모든 유저 상태를 waiting으로 변경: roomId=${roomId}`);

      // 모든 게임 관련 Map 초기화
      this.handPlayMap.delete(roomId);
      this.nextRoundReadyMap.delete(roomId);
      this.shopCardsMap.delete(roomId);
      this.gameReadyMap.delete(roomId);
      this.userOwnedCardsMap.delete(roomId);

      // 5라운드가 넘었을 때 모든 유저의 funds를 0으로 초기화
      // try {
      //   const roomChipsMap = this.userChipsMap.get(roomId);
      //   if (roomChipsMap) {
      //     const userIds = Array.from(roomChipsMap.keys());
      //     this.logger.log(`[handleRoundEnd] 5라운드 종료 - 모든 유저 funds 초기화: roomId=${roomId}, users=${userIds.join(',')}`);

      //     for (const userId of userIds) {
      //       const currentChips = roomChipsMap.get(userId);
      //       if (currentChips) {
      //         const fundsToDeduct = -currentChips.funds; // 현재 funds 값을 음수로 만들어서 0으로 초기화
      //         await this.updateUserFunds(roomId, userId, fundsToDeduct);
      //         this.logger.log(`[handleRoundEnd] 유저 funds 초기화 완료: userId=${userId}, 기존 funds=${currentChips.funds}`);
      //       }
      //     }
      //   }
      // } catch (error) {
      //   this.logger.error(
      //     `[handleRoundEnd] 유저 funds 초기화 중 오류 발생: roomId=${roomId}`,
      //     error instanceof Error ? error.stack : String(error),
      //   );
      // }
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

  /**
   * 방의 현재 phase를 반환합니다.
   */
  getRoomPhase(roomId: string): string | undefined {
    const state = this.gameStates.get(roomId);
    return state?.phase;
  }

  /**
   * 방의 phase를 변경합니다.
   */
  setRoomPhase(roomId: string, phase: 'waiting' | 'playing' | 'shop'): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      this.gameStates.set(roomId, {
        ...state,
        phase,
      });
    }
  }

  /**
   * 유저의 타로 카드 소유 여부를 확인합니다.
   */
  hasUserTarotCard(roomId: string, userId: string, cardId: string): boolean {
    const userTarotCards = this.userTarotCardsMap.get(roomId)?.get(userId) ?? [];
    return userTarotCards.some(card => card.id === cardId);
  }

  /**
   * 유저의 firstDeckCards를 반환합니다.
   */
  getUserFirstDeckCards(roomId: string, userId: string): Card[] {
    return this.userFirstDeckCardsMap.get(roomId)?.get(userId) ?? [];
  }

  /**
   * 유저의 handPlay 상태를 확인합니다.
   */
  hasUserHandPlay(roomId: string, userId: string): boolean {
    const handMap = this.handPlayMap.get(roomId);
    return handMap?.has(userId) ?? false;
  }

  /**
   * 유저의 덱 정보를 반환합니다.
   */
  getUserDeckInfo(roomId: string, userId: string): { remainingDeck: number; remainingSevens: number } {
    const state = this.gameStates.get(roomId);
    if (!state) {
      this.logger.warn(`[getUserDeckInfo] roomId=${roomId}에 대한 상태가 없습니다.`);
      return { remainingDeck: 0, remainingSevens: 0 };
    }

    const deck = state.decks.get(userId);
    if (!deck) {
      this.logger.warn(`[getUserDeckInfo] userId=${userId}의 덱이 없습니다.`);
      return { remainingDeck: 0, remainingSevens: 0 };
    }

    const remainingDeck = deck.length;
    const remainingSevens = deck.filter(card => card.rank === 7).length;

    this.logger.log(
      `[getUserDeckInfo] userId=${userId}, roomId=${roomId}, remainingDeck=${remainingDeck}, remainingSevens=${remainingSevens}`,
    );

    return { remainingDeck, remainingSevens };
  }

  // === [5] discardCountMap 관리 메서드들 ===

  // 유저의 버리기 횟수 가져오기
  getUserDiscardCount(roomId: string, userId: string): number {
    const roomMap = this.discardCountMap.get(roomId);
    if (!roomMap) {
      return 0;
    }
    return roomMap.get(userId) || 0;
  }

  // 유저의 버리기 횟수 증가
  incrementUserDiscardCount(roomId: string, userId: string): number {
    if (!this.discardCountMap.has(roomId)) {
      this.discardCountMap.set(roomId, new Map());
    }

    const userMap = this.discardCountMap.get(roomId)!;
    const currentCount = userMap.get(userId) || 0;
    const newCount = currentCount + 1;
    userMap.set(userId, newCount);

    this.logger.log(`[incrementUserDiscardCount] userId=${userId}, roomId=${roomId}, count: ${currentCount} -> ${newCount}`);
    return newCount;
  }

  // 유저의 남은 버리기 횟수 계산
  getRemainingDiscards(roomId: string, userId: string): number {
    const currentCount = this.getUserDiscardCount(roomId, userId);
    return Math.max(0, 4 - currentCount);
  }

  // 유저가 버리기를 할 수 있는지 확인
  canUserDiscard(roomId: string, userId: string): boolean {
    const currentCount = this.getUserDiscardCount(roomId, userId);
    return currentCount < 4;
  }

  // 방의 모든 유저 버리기 횟수 초기화
  resetDiscardCounts(roomId: string): void {
    this.discardCountMap.delete(roomId);
    this.logger.log(`[resetDiscardCounts] roomId=${roomId}의 버리기 횟수 초기화`);
  }

  // 방의 모든 유저 버리기 횟수 가져오기
  getDiscardCountMap(roomId: string): Map<string, number> {
    return this.discardCountMap.get(roomId) || new Map();
  }

  // 시드머니 납부 관련 헬퍼 메서드들
  getUserSeedMoneyPayment(roomId: string, userId: string): { silverPayment: number; goldPayment: number } {
    const roomPayments = this.userSeedMoneyPayments.get(roomId);
    if (!roomPayments) {
      return { silverPayment: 0, goldPayment: 0 };
    }
    return roomPayments.get(userId) || { silverPayment: 0, goldPayment: 0 };
  }

  getAllUserSeedMoneyPayments(roomId: string): Map<string, { silverPayment: number; goldPayment: number }> {
    return this.userSeedMoneyPayments.get(roomId) || new Map();
  }

  resetSeedMoneyPayments(roomId: string): void {
    this.userSeedMoneyPayments.delete(roomId);
  }

  /**
   * 방에서 퇴장할 때 유저의 칩 정보를 DB에 저장합니다.
   */
  async saveUserChipsOnLeave(roomId: string, userId: string): Promise<boolean> {
    try {
      const roomChipsMap = this.userChipsMap.get(roomId);
      if (!roomChipsMap) {
        this.logger.warn(`[saveUserChipsOnLeave] roomChipsMap not found: roomId=${roomId}`);
        return false;
      }

      const userChips = roomChipsMap.get(userId);
      if (!userChips) {
        this.logger.warn(`[saveUserChipsOnLeave] userChips not found: roomId=${roomId}, userId=${userId}`);
        return false;
      }

      // 현재 실버칩, 골드칩만 DB에 저장
      const success = await this.userService.saveUserChips(
        userId,
        userChips.silverChips,
        userChips.goldChips
      );

      if (success) {
        this.logger.log(`[saveUserChipsOnLeave] 칩 정보 저장 성공: roomId=${roomId}, userId=${userId}, silverChips=${userChips.silverChips}, goldChips=${userChips.goldChips}`);
      } else {
        this.logger.error(`[saveUserChipsOnLeave] 칩 정보 저장 실패: roomId=${roomId}, userId=${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`[saveUserChipsOnLeave] 오류 발생: roomId=${roomId}, userId=${userId}`, error);
      return false;
    }
  }

  /**
   * 특별 카드 사용을 처리합니다.
   */
  async processUseSpecialCard(
    roomId: string,
    userId: string,
    cardId: string,
    cards: Card[]
  ): Promise<{
    success: boolean;
    message: string;
    selectedCards?: Card[];
    resultCards?: Card[];
  }> {
    try {
      // 1. 카드 정보 가져오기
      const cardInfo = this.specialCardManagerService.getCardById(cardId);
      if (!cardInfo) {
        this.logger.warn(`[processUseSpecialCard] 존재하지 않는 카드: userId=${userId}, cardId=${cardId}`);
        return {
          success: false,
          message: '존재하지 않는 카드입니다.'
        };
      }

      this.logger.log(`[processUseSpecialCard] 카드 정보: userId=${userId}, cardId=${cardId}, name=${cardInfo.name}, description=${cardInfo.description}, needCardCount=${cardInfo.needCardCount}`);

      // 2. 카드 개수 검증
      if (cardInfo.needCardCount && cards.length > cardInfo.needCardCount) {
        this.logger.warn(`[processUseSpecialCard] 카드 개수 초과: userId=${userId}, cardId=${cardId}, selected=${cards.length}, required=${cardInfo.needCardCount}`);
        return {
          success: false,
          message: `카드 개수가 초과되었습니다. ${cardInfo.needCardCount}장 이하의 카드를 선택해야 합니다.`
        };
      }

      // 3. 타로 카드 소유 여부 확인
      if (!this.hasUserTarotCard(roomId, userId, cardId)) {
        this.logger.warn(`[processUseSpecialCard] 유효하지 않은 타로 카드: userId=${userId}, cardId=${cardId}`);
        return {
          success: false,
          message: '구매하지 않은 타로 카드입니다.'
        };
      }

      // 4. firstDeckCards 매칭 확인
      const userFirstDeckCards = this.getUserFirstDeckCards(roomId, userId);
      const receivedCardIds = cards.map(card => `${card.suit}_${card.rank}`);
      const firstDeckCardIds = userFirstDeckCards.map(card => `${card.suit}_${card.rank}`);

      const isValidCards = receivedCardIds.every(cardId => firstDeckCardIds.includes(cardId));

      if (!isValidCards) {
        this.logger.warn(`[processUseSpecialCard] 유효하지 않은 카드들: userId=${userId}, receivedCards=${JSON.stringify(receivedCardIds)}, firstDeckCards=${JSON.stringify(firstDeckCardIds)}`);
        return {
          success: false,
          message: '유효하지 않은 카드 조합입니다.'
        };
      }

      this.logger.log(`[processUseSpecialCard] 밸리드 체크 통과: userId=${userId}, cardId=${cardId}`);

      // 5. 카드 ID에 따른 결과 카드 생성 및 modifiedDeck 수정
      const selectedCards = [...cards];
      let resultCards: Card[] = [];

      this.logger.log(`\x1b[35m[🔮 TAROT CARD USE] 시작 - userId=${userId}, cardId=${cardId}, cardName=${cardInfo.name}\x1b[0m`);
      this.logger.log(`\x1b[36m  📋 선택된 카드: ${cards.map(c => `${c.suit}_${c.rank}`).join(', ')}\x1b[0m`);

      switch (cardId) {
        case 'tarot_1':
          // 선택한 카드의 숫자가 1 상승
          resultCards = cards.map(card => ({
            id: card.id,
            suit: card.suit,
            rank: Math.min(card.rank + 1, 13) // 최대 13 (K)
          }));
          this.logger.log(`\x1b[32m  ⬆️  tarot_1 적용: ${cards.map(c => `${c.suit}_${c.rank} → ${c.suit}_${Math.min(c.rank + 1, 13)}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_2':
          // 선택한 카드의 숫자가 2 감소
          resultCards = cards.map(card => ({
            id: card.id,
            suit: card.suit,
            rank: Math.max(card.rank - 2, 1) // 최소 1 (A)
          }));
          this.logger.log(`\x1b[31m  ⬇️  tarot_2 적용: ${cards.map(c => `${c.suit}_${c.rank} → ${c.suit}_${Math.max(c.rank - 2, 1)}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_3':
          // 5장의 무작위 카드가 선택되고, 모두 한 가지 무늬로 변경
          if (userFirstDeckCards.length >= (cardInfo?.needCardCount ?? 5)) {
            // 무작위로 5장 선택
            const shuffledDeck = [...userFirstDeckCards].sort(() => Math.random() - 0.5);
            const randomCards = shuffledDeck.slice(0, cardInfo.needCardCount);

            // selectedCards를 무작위 선택된 카드로 교체
            selectedCards.length = 0;
            selectedCards.push(...randomCards);

            // 결과 카드는 모두 스페이드로 변경
            resultCards = randomCards.map(card => ({
              ...card,
              id: card.id,
              suit: CardType.Spades
            }));

            this.logger.log(`\x1b[33m  🎲 tarot_3 무작위 선택: ${randomCards.map(c => `${c.suit}_${c.rank}`).join(', ')}\x1b[0m`);
            this.logger.log(`\x1b[34m  ♠️  tarot_3 결과: ${resultCards.map(c => `${c.suit}_${c.rank}`).join(', ')}\x1b[0m`);
          } else {
            this.logger.warn(`\x1b[31m  ❌ tarot_3 카드 부족: available=${userFirstDeckCards.length}, required=${cardInfo.needCardCount}\x1b[0m`);
            resultCards = [];
          }
          break;

        case 'tarot_4':
          // 선택한 카드가 스페이드로 변경
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Spades
          }));
          this.logger.log(`\x1b[34m  ♠️  tarot_4 적용: ${cards.map(c => `${c.suit}_${c.rank} → Spades_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_5':
          // 선택한 카드가 다이아로 변경
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Diamonds
          }));
          this.logger.log(`\x1b[36m  ♦️  tarot_5 적용: ${cards.map(c => `${c.suit}_${c.rank} → Diamonds_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_6':
          // 선택한 카드가 하트로 변경
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Hearts
          }));
          this.logger.log(`\x1b[31m  ♥️  tarot_6 적용: ${cards.map(c => `${c.suit}_${c.rank} → Hearts_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_7':
          // 선택한 카드가 클로버로 변경
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Clubs
          }));
          this.logger.log(`\x1b[32m  ♣️  tarot_7 적용: ${cards.map(c => `${c.suit}_${c.rank} → Clubs_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_8':
          // 선택한 카드를 덱에서 삭제 (결과 카드는 빈 배열)
          const modifiedDeck = this.userDeckModifications.get(roomId)?.get(userId);
          if (modifiedDeck) {
            this.logger.log(`\x1b[33m  🗑️  tarot_8 덱에서 삭제 시작: ${cards.map(c => `${c.suit}_${c.rank}`).join(', ')}\x1b[0m`);
            this.logger.log(`\x1b[33m  📊 삭제 전 덱 크기: ${modifiedDeck.length}\x1b[0m`);

            cards.forEach(card => {
              const deckIndex = modifiedDeck.findIndex(deckCard =>
                deckCard.suit === card.suit && deckCard.rank === card.rank
              );
              if (deckIndex !== -1) {
                const removedCard = modifiedDeck.splice(deckIndex, 1)[0];
                this.logger.log(`\x1b[31m  ❌ tarot_8 카드 삭제: ${removedCard.suit}_${removedCard.rank} (인덱스: ${deckIndex})\x1b[0m`);
              } else {
                this.logger.warn(`\x1b[33m  ⚠️  tarot_8 카드를 찾을 수 없음: ${card.suit}_${card.rank}\x1b[0m`);
              }
            });

            this.logger.log(`\x1b[33m  📊 삭제 후 덱 크기: ${modifiedDeck.length}\x1b[0m`);
          } else {
            this.logger.warn(`\x1b[33m  ⚠️  tarot_8 modifiedDeck이 존재하지 않음: userId=${userId}\x1b[0m`);
          }
          resultCards = [];
          break;

        default:
          this.logger.warn(`\x1b[33m  ⚠️  알 수 없는 타로 카드: ${cardId}\x1b[0m`);
          resultCards = [];
      }

      this.logger.log(`\x1b[35m  📤 최종 결과 카드: ${resultCards.map(c => `${c.suit}_${c.rank}`).join(', ') || '없음'}\x1b[0m`);
      this.logger.log(`\x1b[35m[🔮 TAROT CARD USE] 완료 - userId=${userId}, cardId=${cardId}\x1b[0m`);

      // 6. modifiedDeck에서 선택된 카드들을 결과값으로 수정
      const modifiedDeck = this.userDeckModifications.get(roomId)?.get(userId);
      if (modifiedDeck) {
        this.logger.log(`[processUseSpecialCard] modifiedDeck 수정 시작: userId=${userId}, deckSize=${modifiedDeck.length}`);

        for (let i = 0; i < selectedCards.length && i < resultCards.length; i++) {
          const selectedCard = selectedCards[i];
          const resultCard = resultCards[i];

          // modifiedDeck에서 해당 카드 찾기
          const deckIndex = modifiedDeck.findIndex(card =>
            card.id === selectedCard.id
          );

          if (deckIndex !== -1) {
            // 카드 정보 업데이트
            modifiedDeck[deckIndex] = {
              ...modifiedDeck[deckIndex],
              suit: resultCard.suit,
              rank: resultCard.rank
            };
            this.logger.log(`[processUseSpecialCard] modifiedDeck 카드 수정: index=${deckIndex}, ${selectedCard.suit}_${selectedCard.rank} -> ${resultCard.suit}_${resultCard.rank}`);
          } else {
            this.logger.warn(`[processUseSpecialCard] modifiedDeck에서 카드를 찾을 수 없음: ${selectedCard.suit}_${selectedCard.rank}`);
          }
        }

        this.logger.log(`[processUseSpecialCard] modifiedDeck 수정 완료: userId=${userId}`);
      } else {
        this.logger.warn(`[processUseSpecialCard] modifiedDeck이 존재하지 않음: userId=${userId}`);
      }

      return {
        success: true,
        message: '특별 카드 사용이 완료되었습니다.',
        selectedCards,
        resultCards
      };
    } catch (error) {
      this.logger.error(`[processUseSpecialCard] Error: userId=${userId}, cardId=${cardId}`, error);
      return {
        success: false,
        message: '특별 카드 사용 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 핸드 플레이 결과를 처리합니다.
   */
  async processHandPlayResult(
    roomId: string,
    userIds: string[]
  ): Promise<{
    roundResult: Record<string, any>;
    shopCards: string[];
    round: number;
  }> {
    try {
      // const allHandPlayCardsRaw = this.getAllHandPlayCards(roomId);
      // const allHandPlayCards: Record<string, Card[]> = {};

      // if (Array.isArray(allHandPlayCardsRaw)) {
      //   for (const handPlayCardData of allHandPlayCardsRaw) {
      //     if (
      //       handPlayCardData &&
      //       typeof handPlayCardData === 'object' &&
      //       'userId' in handPlayCardData &&
      //       'hand' in handPlayCardData &&
      //       Array.isArray(handPlayCardData.hand)
      //     ) {
      //       allHandPlayCards[handPlayCardData.userId] = handPlayCardData.hand;
      //     }
      //   }
      // }

      const allHandPlayCards = this.handPlayMap.get(roomId);

      if (!allHandPlayCards) {
        this.logger.error(`[processHandPlayResult] allHandPlayCards not found: roomId=${roomId}`);
        return {
          roundResult: {},
          shopCards: [],
          round: 0
        };
      }

      // const allHandPlayCards: Record<string, Card[]> = {};
      // for (const [userId, playCards] of allHandPlayCards.entries()) {
      //   allHandPlayCards[userId] = playCards;
      // }

      const ownedCards: Record<string, string[]> = {};
      for (const uid of userIds) {
        ownedCards[uid] = this.getUserOwnedCards(roomId, uid);
      }

      // playing 상태인 유저들의 점수 계산
      const userScores: Record<string, number> = {};
      const userRandomValues: Record<string, number> = {};

      for (const userId of userIds) {
        await this.updateUserFunds(roomId, userId, 4);
        const updatedChips = await this.getUserChips(roomId, userId);

        let remainingDiscards = 4;
        const discardUserMap = this.getDiscardCountMap(roomId);
        if (discardUserMap) {
          const used = discardUserMap.get(userId) ?? 0;
          remainingDiscards = 4 - used;
        }

        const { remainingDeck, remainingSevens } = this.getUserDeckInfo(roomId, userId);

        // 유저의 전체 핸드 카드 가져오기
        const fullHand = this.getUserHand(roomId, userId);
        const playedHand = allHandPlayCards.get(userId) || [];

        // usedHand: 클라에서 받은 playedHand(순서 그대로)
        // const usedHand = playedHand;

        // 새로운 점수 계산 시스템 사용
        let finalScore = 0;
        let finalChips = 0;
        let finalMultiplier = 0;
        let finalRandomValue = 0;

        if (playedHand.length > 0) {

          // 족보 판정 및 기본 점수 계산
          const handResult = this.handEvaluatorService.evaluate(userId, playedHand, fullHand);

          // 조커 효과 적용 및 최종 점수 계산
          const ownedJokers = ownedCards[userId] || [];
          const scoreResult = this.specialCardManagerService.calculateFinalScore(
            userId,
            handResult,
            ownedJokers,
            remainingDiscards,
            remainingDeck,
            remainingSevens
          );

          finalChips = scoreResult.finalChips;
          finalMultiplier = scoreResult.finalMultiplier;
          finalScore = finalChips * finalMultiplier;
          finalRandomValue = scoreResult.context.randomValue;

          // 🎯 서버 점수 계산 결과 로그 (클라이언트와 비교용)
          this.logger.log(`\x1b[36m[SCORE_CALC] ${userId} - ${handResult.pokerHand}\x1b[0m`);
          this.logger.log(`\x1b[33m  📊 기본 점수: ${handResult.score} | 기본 배수: ${handResult.multiplier}\x1b[0m`);
          this.logger.log(`\x1b[32m  🎴 사용된 카드: ${handResult.usedCards.map(c => `${c.suit}${c.rank}(id:${c.id || 'undefined'})`).join(', ')}\x1b[0m`);
          this.logger.log(`\x1b[32m  🎴 사용안된 카드: ${handResult.unUsedCards.map(c => `${c.suit}${c.rank}(id:${c.id || 'undefined'})`).join(', ')}\x1b[0m`);
          // 디버깅용: 첫 번째 사용된 카드의 전체 구조 출력
          if (handResult.usedCards.length > 0) {
            this.logger.log(`\x1b[33m  🔍 첫 번째 사용된 카드 구조: ${JSON.stringify(handResult.usedCards[0])}\x1b[0m`);
          }
          this.logger.log(`\x1b[35m  🃏 보유 조커: ${ownedJokers.join(', ') || '없음'}\x1b[0m`);
          this.logger.log(`\x1b[31m  💰 최종 칩스: ${finalChips} | 최종 배수: ${finalMultiplier} | 최종 점수: ${finalScore}\x1b[0m`);
          this.logger.log(`\x1b[34m  📈 남은 버리기: ${remainingDiscards} | 남은 덱: ${remainingDeck} | 남은 7: ${remainingSevens}\x1b[0m`);
          this.logger.log(`\x1b[37m  ────────────────────────────────────────────────\x1b[0m`);

          // Paytable 업데이트 (족보 카운트 증가)
          this.paytableService.enhanceCount(userId, handResult.pokerHand);
        }

        userScores[userId] = finalScore;
        userRandomValues[userId] = finalRandomValue;
      }

      // 승자 판정 및 시드머니 분배 계산
      const allScores = userIds.map(uid => ({ userId: uid, score: userScores[uid] || 0 }));
      const maxScore = Math.max(...allScores.map(s => s.score));
      const winners = allScores.filter(s => s.score === maxScore && s.score > 0);

      // 전체 시드머니 납부 금액 계산
      const allPayments = this.getAllUserSeedMoneyPayments(roomId);
      let totalSilverPayment = 0;
      let totalGoldPayment = 0;

      for (const [uid, payment] of allPayments.entries()) {
        totalSilverPayment += payment.silverPayment;
        totalGoldPayment += payment.goldPayment;
      }

      this.logger.log(
        `[processHandPlayResult] 시드머니 분배 준비: ` +
        `전체시드머니(실버=${totalSilverPayment}, 골드=${totalGoldPayment}), ` +
        `승자수=${winners.length}, ` +
        `점수분포=${JSON.stringify(allScores.map(s => ({ userId: s.userId, score: s.score })))}`
      );

      // 각 유저별 결과 처리
      const roundResult: Record<string, any> = {};

      for (const userId of userIds) {
        const updatedChips = await this.getUserChips(roomId, userId);
        const { remainingDeck, remainingSevens } = this.getUserDeckInfo(roomId, userId);

        let remainingDiscards = 4;
        const discardUserMap = this.getDiscardCountMap(roomId);
        if (discardUserMap) {
          const used = discardUserMap.get(userId) ?? 0;
          remainingDiscards = 4 - used;
        }

        const fullHand = this.getUserHand(roomId, userId);
        const playedHand = allHandPlayCards.get(userId) || [];
        const finalScore = userScores[userId] || 0;

        // 승자별 분배 금액 계산
        let silverChipGain = 0;
        let goldChipGain = 0;
        let isWinner = -1;

        if (winners.length > 0 && winners.some(w => w.userId === userId)) {
          isWinner = 1;

          // 승자인 경우
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자인 경우
            // 각 패자에게서 가져올 수 있는 금액 = min(자신이낸금액, 패자가낸금액)
            let totalSilverFromLosers = 0;
            let totalGoldFromLosers = 0;

            for (const uid of userIds) {
              if (uid !== userId) { // 패자들만
                const loserPayment = this.getUserSeedMoneyPayment(roomId, uid);
                const silverFromThisLoser = Math.min(userPayment.silverPayment, loserPayment.silverPayment);
                const goldFromThisLoser = Math.min(userPayment.goldPayment, loserPayment.goldPayment);

                totalSilverFromLosers += silverFromThisLoser;
                totalGoldFromLosers += goldFromThisLoser;
              }
            }

            // 자신이 낸 금액 + 패자들에게서 가져온 금액
            silverChipGain = userPayment.silverPayment + totalSilverFromLosers;
            goldChipGain = userPayment.goldPayment + totalGoldFromLosers;

            this.logger.log(
              `[processHandPlayResult] ${userId} 단독 승자 분배: ` +
              `자신납부(실버=${userPayment.silverPayment}, 골드=${userPayment.goldPayment}), ` +
              `패자들에게서받음(실버=${totalSilverFromLosers}, 골드=${totalGoldFromLosers}), ` +
              `총획득(실버=${silverChipGain}, 골드=${goldChipGain})`
            );
          } else {
            // 공동 승자인 경우
            // 각 승자는 자신이 납부한 금액만큼만 다른 유저들에게서 가져갈 수 있음
            const otherUsersCount = userIds.length - winners.length;
            let totalSilverFromLosers = 0;
            let totalGoldFromLosers = 0;

            for (const uid of userIds) {
              if (!winners.some(w => w.userId === uid)) { // 패자들만
                const loserPayment = this.getUserSeedMoneyPayment(roomId, uid);
                // 각 승자가 가져갈 수 있는 금액 = min(자신이낸금액, 패자가낸금액) / 승자수
                const silverPerWinner = Math.min(userPayment.silverPayment, loserPayment.silverPayment) / winners.length;
                const goldPerWinner = Math.min(userPayment.goldPayment, loserPayment.goldPayment) / winners.length;

                totalSilverFromLosers += silverPerWinner;
                totalGoldFromLosers += goldPerWinner;
              }
            }

            silverChipGain = userPayment.silverPayment + totalSilverFromLosers;
            goldChipGain = userPayment.goldPayment + totalGoldFromLosers;

            this.logger.log(
              `[processHandPlayResult] ${userId} 공동 승자 분배: ` +
              `자신납부(실버=${userPayment.silverPayment}, 골드=${userPayment.goldPayment}), ` +
              `패자들에게서받음(실버=${totalSilverFromLosers}, 골드=${totalGoldFromLosers}), ` +
              `총획득(실버=${silverChipGain}, 골드=${goldChipGain})`
            );
          }
        } else {
          // 패자인 경우 - 자신이 납부한 시드머니에서 승자에게 빼앗긴 금액을 제외하고 돌려받음
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자가 있는 경우
            const winnerPayment = this.getUserSeedMoneyPayment(roomId, winners[0].userId);
            const takenByWinner = Math.min(userPayment.silverPayment, winnerPayment.silverPayment);
            const takenByWinnerGold = Math.min(userPayment.goldPayment, winnerPayment.goldPayment);

            silverChipGain = userPayment.silverPayment - takenByWinner;
            goldChipGain = userPayment.goldPayment - takenByWinnerGold;

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불: ` +
              `자신납부(실버=${userPayment.silverPayment}, 골드=${userPayment.goldPayment}), ` +
              `승자에게빼앗김(실버=${takenByWinner}, 골드=${takenByWinnerGold}), ` +
              `환불량(실버=${silverChipGain}, 골드=${goldChipGain})`
            );
          } else if (winners.length > 1) {
            // 공동 승자가 있는 경우
            let totalTakenSilver = 0;
            let totalTakenGold = 0;

            for (const winner of winners) {
              const winnerPayment = this.getUserSeedMoneyPayment(roomId, winner.userId);
              // 각 승자가 가져갈 수 있는 금액 = min(승자가낸금액, 패자가낸금액) / 승자수
              const silverPerWinner = Math.min(winnerPayment.silverPayment, userPayment.silverPayment) / winners.length;
              const goldPerWinner = Math.min(winnerPayment.goldPayment, userPayment.goldPayment) / winners.length;

              totalTakenSilver += silverPerWinner;
              totalTakenGold += goldPerWinner;
            }

            silverChipGain = userPayment.silverPayment - totalTakenSilver;
            goldChipGain = userPayment.goldPayment - totalTakenGold;

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불(공동승자): ` +
              `자신납부(실버=${userPayment.silverPayment}, 골드=${userPayment.goldPayment}), ` +
              `승자들에게빼앗김(실버=${totalTakenSilver}, 골드=${totalTakenGold}), ` +
              `환불량(실버=${silverChipGain}, 골드=${goldChipGain})`
            );
          } else {
            isWinner = 0;
            // 승자가 없는 경우 (모든 점수가 0)
            silverChipGain = userPayment.silverPayment;
            goldChipGain = userPayment.goldPayment;

            this.logger.log(
              `[processHandPlayResult] ${userId} 무승부 환불: ` +
              `자신납부(실버=${userPayment.silverPayment}, 골드=${userPayment.goldPayment}), ` +
              `환불량(실버=${silverChipGain}, 골드=${goldChipGain})`
            );
          }
        }

        // 유저 칩 업데이트
        const updateSuccess = await this.updateUserChips(
          roomId,
          userId,
          silverChipGain,
          goldChipGain
        );

        if (!updateSuccess) {
          this.logger.error(`[processHandPlayResult] 칩 업데이트 실패: userId=${userId}`);
          throw new Error('칩 업데이트 실패');
        }

        // 업데이트된 칩 정보 가져오기
        const finalUpdatedChips = await this.getUserChips(roomId, userId);

        this.logger.log(
          `[processHandPlayResult] ${userId} 결과: ` +
          `점수=${finalScore}, ` +
          `승자여부=${winners.some(w => w.userId === userId)}, ` +
          `획득량(실버=${silverChipGain}, 골드=${goldChipGain}), ` +
          `최종(실버=${finalUpdatedChips.silverChips}, 골드=${finalUpdatedChips.goldChips}, 자금=${finalUpdatedChips.funds})`
        );

        roundResult[userId] = {
          isWinner: isWinner,
          usedHand: playedHand,
          fullHand: fullHand,
          score: finalScore,
          silverChipGain: silverChipGain,
          goldChipGain: goldChipGain,
          finalSilverChips: finalUpdatedChips.silverChips,
          finalGoldChips: finalUpdatedChips.goldChips,
          finalFunds: finalUpdatedChips.funds,
          remainingDiscards,
          remainingDeck,
          remainingSevens,
          randomValue: userRandomValues[userId],
          ownedCards: ownedCards[userId] || [],
        };
      }

      const shopCards = this.getShopCards(roomId);
      const round = this.getRound(roomId);

      // phase를 shop으로 변경
      this.setRoomPhase(roomId, 'shop');

      await this.handleRoundEnd(roomId, userIds);


      return {
        roundResult,
        shopCards,
        round
      };
    } catch (error) {
      this.logger.error(`[processHandPlayResult] Error: roomId=${roomId}`, error);
      throw error;
    }
  }

  /**
   * 게임 시작 정보를 생성합니다.
   */
  async createStartGameInfo(
    roomId: string,
    userId: string,
    userIds: string[]
  ): Promise<{
    round: number;
    totalDeckCards: number; // 내 덱의 총 카드 수
    silverSeedChip: number;
    goldSeedChip: number;
    silverTableChip: number;
    goldTableChip: number;
    userInfo: Record<string, any>;
  }> {
    const myCards = this.getUserHand(roomId, userId);
    const round = this.getRound(roomId);
    const silverSeedChip = this.getCurrentSilverSeedChip(roomId);
    const goldSeedChip = this.getCurrentGoldSeedChip(roomId);

    // 내 덱의 총 카드 수 계산 (초기 총 개수 표시용으로 핸드 카드 8장 포함)
    const gameState = this.gameStates.get(roomId);
    let totalDeckCards = 0;
    if (gameState && gameState.decks.has(userId)) {
      totalDeckCards = (gameState.decks.get(userId)?.length || 0) + 8; // 덱 카드 + 핸드 카드 8장
    }

    // playing 상태인 유저들만 필터링
    const playingUserIds = userIds.filter(uid => this.isUserPlaying(roomId, uid));

    const silverTableChip = silverSeedChip * userIds.length;
    const goldTableChip = goldSeedChip * userIds.length;

    const userInfo: Record<string, any> = {};

    // playing 상태인 유저들만 userInfo에 포함
    for (const uid of playingUserIds) {
      const userChips = await this.getUserChips(roomId, uid);

      // 시드머니 납부 정보 가져오기
      const seedPayment = this.getUserSeedMoneyPayment(roomId, uid);

      // 유저별 정보 생성
      if (uid === userId) {
        // 내 정보 (카드 포함)
        userInfo[uid] = {
          cards: myCards,
          userFunds: userChips.funds,
          silverChipGain: -seedPayment.silverPayment,
          goldChipGain: -seedPayment.goldPayment,
          silverChipNow: userChips.silverChips,
          goldChipNow: userChips.goldChips
        };
      } else {
        userInfo[uid] = {
          userFunds: userChips.funds,
          silverChipGain: -seedPayment.silverPayment,
          goldChipGain: -seedPayment.goldPayment,
          silverChipNow: userChips.silverChips,
          goldChipNow: userChips.goldChips
        };
      }
    }

    return {
      round,
      totalDeckCards,
      silverSeedChip,
      goldSeedChip,
      silverTableChip,
      goldTableChip,
      userInfo
    };
  }


  // === 유저별 게임 상태 관리 메서드들 ===

  /**
   * 유저의 게임 상태를 설정합니다.
   */
  setUserStatus(roomId: string, userId: string, status: 'waiting' | 'playing'): void {
    const userStatuses = this.getOrCreateMap(this.userStatusMap, roomId, () => new Map());
    userStatuses.set(userId, status);
    this.logger.log(`[setUserStatus] userId=${userId}, roomId=${roomId}, status=${status}`);
  }

  /**
   * 유저의 게임 상태를 가져옵니다.
   */
  getUserStatus(roomId: string, userId: string): 'waiting' | 'playing' | undefined {
    const userStatuses = this.userStatusMap.get(roomId);
    return userStatuses?.get(userId);
  }

  /**
   * 모든 유저의 게임 상태를 가져옵니다.
   */
  getAllUserStatuses(roomId: string): Map<string, 'waiting' | 'playing'> {
    return this.userStatusMap.get(roomId) || new Map();
  }

  /**
   * 유저가 playing 상태인지 확인합니다.
   */
  isUserPlaying(roomId: string, userId: string): boolean {
    return this.getUserStatus(roomId, userId) === 'playing';
  }

  /**
   * 유저가 waiting 상태인지 확인합니다.
   */
  isUserWaiting(roomId: string, userId: string): boolean {
    return this.getUserStatus(roomId, userId) === 'waiting';
  }

  /**
   * 방의 모든 유저 상태를 waiting으로 설정합니다.
   */
  setAllUsersToWaiting(roomId: string, userIds: string[]): void {
    const userStatuses = this.getOrCreateMap(this.userStatusMap, roomId, () => new Map());
    userIds.forEach(userId => {
      userStatuses.set(userId, 'waiting');
    });
    this.logger.log(`[setAllUsersToWaiting] roomId=${roomId}, userIds=${userIds.join(',')}`);
  }

  /**
   * 방의 모든 유저 상태를 playing으로 설정합니다.
   */
  setAllUsersToPlaying(roomId: string, userIds: string[]): void {
    const userStatuses = this.getOrCreateMap(this.userStatusMap, roomId, () => new Map());
    userIds.forEach(userId => {
      userStatuses.set(userId, 'playing');
    });
    this.logger.log(`[setAllUsersToPlaying] roomId=${roomId}, userIds=${userIds.join(',')}`);
  }

  /**
 * 유저의 모든 족보 레벨 정보를 가져옵니다.
 */
  getUserPaytableLevels(roomId: string, userId: string): Record<string, number> {
    const levels: Record<string, number> = {};

    // 모든 족보에 대해 레벨 정보 가져오기
    Object.values(PokerHand).forEach(hand => {
      if (hand !== PokerHand.None) {
        levels[hand as string] = this.paytableService.getLevel(userId, hand as PokerHand);
      }
    });

    return levels;
  }

  /**
   * 유저의 모든 족보 베이스 칩 정보를 가져옵니다.
   */
  getUserPaytableBaseChips(roomId: string, userId: string): Record<string, number> {
    const baseChips: Record<string, number> = {};

    // 모든 족보에 대해 베이스 칩 정보 가져오기
    Object.values(PokerHand).forEach(hand => {
      if (hand !== PokerHand.None) {
        baseChips[hand as string] = this.paytableService.getChips(userId, hand as PokerHand);
      }
    });

    return baseChips;
  }

  /**
   * 유저의 모든 족보 배수 정보를 가져옵니다.
   */
  getUserPaytableMultipliers(roomId: string, userId: string): Record<string, number> {
    const multipliers: Record<string, number> = {};

    // 모든 족보에 대해 배수 정보 가져오기
    Object.values(PokerHand).forEach(hand => {
      if (hand !== PokerHand.None) {
        multipliers[hand as string] = this.paytableService.getMultiplier(userId, hand as PokerHand);
      }
    });

    return multipliers;
  }
}
