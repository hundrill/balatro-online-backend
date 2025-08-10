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
import { SpecialCardData } from './special-card-manager.service';
import { UserService } from '../user/user.service';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { SpecialCardManagerService } from './special-card-manager.service';
import { CardType, PokerHandResult, PokerHand } from './poker-types';
import { GameSettingsService } from '../common/services/game-settings.service';
import { FoldResponseDto } from './socket-dto/fold-response.dto';
import { TranslationKeys } from '../common/translation-keys.enum';

// RoomState 인터페이스 정의
interface RoomState {
  // 기존 gameState 필드들
  decks: Map<string, Card[]>; // userId별 덱
  hands: Map<string, Card[]>; // userId별 핸드
  round: number;
  phase: 'waiting' | 'playing' | 'shop';

  // 칩 설정 (방별로 1개 타입만 사용)
  chipSettings: RoomChipSettings;
  currentBettingAmount: number; // 현재 라운드의 베팅 금액

  // 통합된 필드들
  handPlayMap: Map<string, Card[]>; // userId -> hand
  nextRoundReadySet: Set<string>; // userId Set
  gameReadySet: Set<string>; // userId Set
  shopCards: SpecialCardData[]; // 샵 카드 5장
  reRollCardsMap: Map<string, SpecialCardData[]>; // userId -> reRollCards
  userOwnedCardsMap: Map<string, SpecialCardData[]>; // userId -> ownedCards
  userDeckModifications: Map<string, Card[]>; // userId -> modifiedDeck
  userTarotCardsMap: Map<string, SpecialCardData[]>; // userId -> tarotCards
  userFirstDeckCardsMap: Map<string, Card[]>; // userId -> firstDeckCards
  userChipsMap: Map<string, UserChips>; // userId -> chips
  bettingSet: Set<string>; // userId Set (라운드당 1번 베팅한 유저들)
  usedJokerCardIds: Set<string>; // 조커카드 id Set
  discardCountMap: Map<string, number>; // userId -> count
  userGameStatusMap: Map<string, 'active' | 'inactive' | 'afk'>; // userId -> status
  userStatusMap: Map<string, 'waiting' | 'playing'>; // userId -> status
  userSeedMoneyPayments: Map<string, SeedPayment>; // userId -> payment
  roundMaxPrizes: number[]; // [1라운드, 2라운드, 3라운드, 4라운드, 5라운드]

  // 메서드들
  resetGameStateForNewGame(): void; // 게임 상태만 초기화 (방 설정값 유지)
}

interface UserChips {
  chips: number;  // 현재 칩 타입에 따른 칩 수량
  funds: number;  // 자금
}

// 시드 머니 납부 정보
interface SeedPayment {
  payment: number;  // 실제 납부한 칩 수량
  funds: number;    // 실제 납부한 자금
}

// 칩 타입 열거형
export enum ChipType {
  SILVER = 'silver',
  GOLD = 'gold'
}

// 방별 칩 설정
interface RoomChipSettings {
  chipType: ChipType;  // 방에서 사용할 칩 타입 (1개만)
  seedAmount: number;  // 시드 머니
  bettingAmount: number;  // 베팅 머니
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  // === [유틸리티 함수] ===

  private resetRoomState(roomId: string) {
    this.gameStates.delete(roomId);
  }

  // RoomState 유틸리티 메서드들
  private getRoomState(roomId: string): RoomState {
    if (!this.gameStates.has(roomId)) {
      this.gameStates.set(roomId, this.createInitialRoomState());
    }
    return this.gameStates.get(roomId)!;
  }

  private createInitialRoomState(): RoomState {
    return {
      decks: new Map(),
      hands: new Map(),
      round: 1,
      phase: 'waiting',
      chipSettings: {
        chipType: ChipType.SILVER,
        seedAmount: 0,
        bettingAmount: 0
      },
      currentBettingAmount: 0,
      handPlayMap: new Map(),
      nextRoundReadySet: new Set(),
      gameReadySet: new Set(),
      shopCards: [],
      reRollCardsMap: new Map(),
      userOwnedCardsMap: new Map(),
      userDeckModifications: new Map(),
      userTarotCardsMap: new Map(),
      userFirstDeckCardsMap: new Map(),
      userChipsMap: new Map(),
      bettingSet: new Set(),
      usedJokerCardIds: new Set(),
      discardCountMap: new Map(),
      userGameStatusMap: new Map(),
      userStatusMap: new Map(),
      userSeedMoneyPayments: new Map(),
      roundMaxPrizes: [1, 2, 3, 4, 5],

      // 메서드 구현
      resetGameStateForNewGame(): void {
        // 게임 진행 관련 상태만 초기화 (방 설정값 유지)
        this.round = 1;
        this.phase = 'waiting';
        this.decks.clear();
        this.hands.clear();
        this.handPlayMap.clear();
        this.nextRoundReadySet.clear();
        this.gameReadySet.clear();
        this.shopCards = [];
        this.reRollCardsMap.clear();
        this.userOwnedCardsMap.clear();
        this.userDeckModifications.clear();
        this.userTarotCardsMap.clear();
        this.userFirstDeckCardsMap.clear();
        this.userChipsMap.clear();
        this.bettingSet.clear();
        this.usedJokerCardIds.clear();
        this.discardCountMap.clear();
        this.userGameStatusMap.clear();
        this.userStatusMap.clear();
        this.userSeedMoneyPayments.clear();
        this.roundMaxPrizes = [1, 2, 3, 4, 5];

        // 베팅칩 초기화
        this.currentBettingAmount = 0;

        // chipSettings은 유지 (방 설정값이므로)
      }
    };
  }

  /**
   * 지연 초기화를 위한 유틸리티 메서드들
   */
  private getOrCreateMap<K, V>(map: Map<K, V>, key: K, defaultValue: () => V): V {
    if (!map.has(key)) {
      map.set(key, defaultValue());
    }
    return map.get(key)!;
  }

  private getOrCreateSet<K>(set: Set<K>, key: K): Set<K> {
    if (!set.has(key)) {
      set.add(key);
    }
    return set;
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
    private readonly gameSettingsService: GameSettingsService,
  ) { }

  // 통합된 RoomState 관리
  private gameStates: Map<string, RoomState> = new Map();

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
    chipType: ChipType,
    seedAmount: number,
    bettingAmount: number,
  ) {
    try {
      this.logger.debug(`Creating Redis room: ${name}`);
      const roomId = uuidv4();
      const roomKey = `room:${roomId}`;
      // TODO: 임시로 GameSettingsService에서 시드머니 값을 가져옴
      // 나중에는 클라이언트에서 받은 값으로 설정하도록 수정 예정
      let finalChipType = chipType;
      let finalSeedAmount = seedAmount;
      let finalBettingAmount = bettingAmount;

      try {
        const chipSettings = await this.prisma.gameSetting.findFirst({
          where: { id: 'chipSettings', isActive: true }
        });

        if (chipSettings && chipSettings.value) {
          const chipData = JSON.parse(chipSettings.value);
          if (chipData.chipType) {
            finalChipType = chipData.chipType;
          }
          if (chipData.seedAmount) {
            finalSeedAmount = chipData.seedAmount;
          }
          if (chipData.bettingAmount) {
            finalBettingAmount = chipData.bettingAmount;
          }
        }
      } catch (error) {
        this.logger.error(`[createRoom] Redis 저장용 시드머니 설정 오류, 기본값 사용`, error);
      }

      const roomData = {
        roomId,
        name,
        maxPlayers,
        players: 1,
        status: 'waiting',
        createdAt: Date.now(),
        chipSettings: {
          chipType: finalChipType,
          seedAmount: finalSeedAmount,
          bettingAmount: finalBettingAmount
        },
      };
      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      await client.sadd('rooms', roomId);
      this.logger.debug(`Room created successfully: ${roomId}`);
      // === 메모리 상태도 초기화 ===
      const roomState = this.createInitialRoomState();

      // 위에서 설정한 최종 시드머니 값을 메모리 상태에도 적용
      roomState.chipSettings.chipType = finalChipType;
      roomState.chipSettings.seedAmount = finalSeedAmount;
      roomState.chipSettings.bettingAmount = finalBettingAmount;
      roomState.currentBettingAmount = 0;

      this.logger.log(`[createRoom] 최종 시드머니 설정: chipType=${finalChipType}, seedAmount=${finalSeedAmount}, bettingAmount=${finalBettingAmount}`);

      this.gameStates.set(roomId, roomState);

      // 라운드별 최대 상금 초기화
      await this.initializeRoundMaxPrizes(roomId);

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
              const seedChip = this.getBaseSeedAmount(roomId);
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
      const roomState = this.getRoomState(roomId);
      roomState.userStatusMap.delete(userId);

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

      // 메모리 상태도 초기화
      this.resetRoomState(roomId);

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
    const roomState = this.getRoomState(roomId);
    roomState.gameReadySet.add(userId);
    this.logger.log(
      `[setReady] userId=${userId}가 roomId=${roomId}에서 준비 완료`,
    );
  }

  // Gateway 접근 로직 분리
  private getGatewayInstance() {
    return (global as any).roomGatewayInstance;
  }

  private getRoomUserIds(roomId: string): string[] {
    const gateway = this.getGatewayInstance();
    if (!gateway?.server?.of || !gateway.socketSessions) {
      return [];
    }

    const adapter = gateway.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);
    if (!room) return [];

    const userIds: string[] = [];
    for (const socketId of room) {
      const session = gateway.socketSessions.get(socketId);
      if (session?.userId) userIds.push(session.userId);
    }
    return userIds;
  }

  canStart(roomId: string): boolean {
    try {
      // Gateway 인스턴스 확인
      const gateway = this.getGatewayInstance();
      if (!gateway || typeof gateway.server?.of !== 'function') {
        this.logger.warn(
          '[canStart] RoomGateway 인스턴스 또는 server가 없습니다.',
        );
        return false;
      }

      // 방에 있는 모든 유저 ID 가져오기
      const userIds = this.getRoomUserIds(roomId);
      if (userIds.length === 0) {
        this.logger.warn(`[canStart] roomId=${roomId}에 유저가 없음`);
        return false;
      }

      // 준비된 유저들 가져오기
      const roomState = this.getRoomState(roomId);
      const readyUsers = Array.from(roomState.gameReadySet);

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
    const roomState = this.getRoomState(roomId);
    roomState.handPlayMap.clear();
    roomState.nextRoundReadySet.clear();
    roomState.bettingSet.clear();
    roomState.userTarotCardsMap.clear();
    roomState.userFirstDeckCardsMap.clear();

    const gateway = (
      global as {
        roomGatewayInstance?: {
          server?: { of: (ns: string) => { adapter: any } };
          socketSessions?: Map<string, { userId: string; roomId: string | null; language: string }>;
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
    if (gateway.socketSessions) {
      for (const socketId of room) {
        const session = gateway.socketSessions.get(socketId);
        const uid = session?.userId;
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
    const round = roomState.round;

    let participatingUserIds: string[];

    if (round === 1) {
      // 1라운드: 모든 유저 참여
      participatingUserIds = [...userIds];
      this.logger.log(`[startGame] 1라운드 - 모든 유저 참여: ${participatingUserIds.join(',')}`);
    } else {
      // 2라운드 이상: playing 상태인 유저만 참여
      participatingUserIds = this.getPlayingUserIds(roomId, userIds);
      this.logger.log(`[startGame] ${round}라운드 - playing 상태 유저만 참여: ${participatingUserIds.join(',')}`);
    }

    // userId별로 덱 셔플 (참여하는 유저만)
    const decks = new Map<string, Card[]>();
    const hands = new Map<string, Card[]>();
    for (const userId of participatingUserIds) {
      let userDeck: Card[];

      // 수정된 덱이 있는지 확인
      const userDeckModifications = roomState.userDeckModifications.get(userId);
      if (userDeckModifications) {
        // 수정된 덱이 있으면 그것을 사용
        userDeck = shuffle([...userDeckModifications]);
        roomState.userDeckModifications.delete(userId); // 사용 후 삭제
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
    roomState.decks = decks;
    roomState.hands = hands;
    roomState.round = round;
    roomState.phase = 'playing';
    this.logger.log(
      `[startGame] === 게임 상태 저장 완료: roomId=${roomId}, round=${round} ===`,
    );

    // 라운드에 따라 유저 상태 변경
    if (round === 1) {
      // 1라운드: 모든 유저를 playing으로 변경
      this.setAllUsersToPlaying(roomId, userIds);
      roomState.usedJokerCardIds.clear();
      this.paytableService.resetAllUserData();
      this.logger.log(`[startGame] 1라운드 시작 - 사용된 조커카드 추적 초기화 및 paytable 데이터 초기화: roomId=${roomId}`);
    }

    // 샵 카드 5장 생성 (조커 3장, 행성 1장, 타로 1장) - 이미 등장한 조커카드 제외
    const shopCards = this.specialCardManagerService.getRandomShopCards(5, roomState.usedJokerCardIds);
    roomState.shopCards = [...shopCards]; // 복사본 저장

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    shopCards.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        roomState.usedJokerCardIds.add(card.id);
        this.logger.log(`[startGame] 조커카드 ${card.id}를 usedJokerSet에 추가: roomId=${roomId}`);
      }
    });

    // 새로운 라운드 시작 시 다시뽑기 카드 초기화
    roomState.reRollCardsMap.clear();
    // 새로운 라운드 시작 시 버리기 횟수 초기화
    roomState.discardCountMap.clear();

    // 1라운드일 때만 시드머니 납부 처리
    if (round === 1) {
      this.resetBettingChips(roomId);

      const baseSeedAmount = this.getBaseSeedAmount(roomId);

      // 유저별 시드머니 납부 처리
      for (const uid of userIds) {
        const chips = await this.getUserChips(roomId, uid);

        // 실제 납부 가능한 금액 계산 (가진 돈이 부족하면 가진 돈만큼만)
        const actualPayment = Math.min(baseSeedAmount, chips.chips);

        // 시드머니 납부 기록 저장
        roomState.userSeedMoneyPayments.set(uid, {
          payment: actualPayment,
          funds: 0
        });

        // 시드머니 차감 및 funds 초기화
        await this.updateUserChips(roomId, uid, -actualPayment);
        await this.updateUserFunds(roomId, uid, -chips.funds);

        this.logger.log(
          `[startGame] 1라운드 ${uid} 시드머니 납부: ` +
          `요구(seedAmount=${baseSeedAmount}), ` +
          `실제납부(payment=${actualPayment}), ` +
          `자금=${chips.funds}`
        );
      }
    } else {
      // 2라운드 이상: 베팅칩만큼 실제 칩을 감소시키고 납부기록에 추가
      const bettingAmount = this.getCurrentBettingAmount(roomId);

      // 베팅칩이 있으면 각 유저의 칩을 감소시키고 납부기록에 추가
      if (bettingAmount > 0) {
        for (const uid of userIds) {
          const chips = await this.getUserChips(roomId, uid);

          // 실제 납부 가능한 금액 계산 (가진 돈이 부족하면 가진 돈만큼만)
          const actualPayment = Math.min(bettingAmount, chips.chips);

          const existingPayment = roomState.userSeedMoneyPayments.get(uid) || { payment: 0, funds: 0 };

          // 기존 납부 기록에 실제 납부한 베팅칩 추가
          roomState.userSeedMoneyPayments.set(uid, {
            payment: existingPayment.payment + actualPayment,
            funds: existingPayment.funds
          });

          // 실제 칩 감소
          await this.updateUserChips(roomId, uid, -actualPayment);

          this.logger.log(
            `[startGame] ${round}라운드 ${uid} 베팅칩 시드머니 납부: ` +
            `요구베팅(bettingAmount=${bettingAmount}), ` +
            `실제납부(payment=${actualPayment}), ` +
            `기존납부(payment=${existingPayment.payment}), ` +
            `총납부(payment=${existingPayment.payment + actualPayment})`
          );
        }
      } else {
        this.logger.log(`[startGame] ${round}라운드 - 베팅칩 없음, 시드머니 납부 없음`);
      }
    }
  }

  getUserHand(roomId: string, userId: string): Card[] {
    const roomState = this.getRoomState(roomId);
    const hand = roomState.hands.get(userId);
    return hand ? [...hand] : [];
  }

  getOpponentCardCounts(
    roomId: string,
    userId: string,
  ): { userId: string; cardCount: number }[] {
    const roomState = this.getRoomState(roomId);
    const result: { userId: string; cardCount: number }[] = [];
    for (const [uid, hand] of roomState.hands.entries()) {
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
    socketSessions: Map<string, { userId: string; roomId: string | null; language: string }>,
  ) {
    // 해당 방에 속한 모든 socketId를 찾음
    const socketIdsInRoom: string[] = [];
    for (const [socketId, session] of socketSessions.entries()) {
      if (session.roomId === roomId) {
        // 해당 소켓이 이 방에 속해 있음
        if (session.userId === userId) {
          // 해당 유저의 세션에서 방 제거
          session.roomId = null;
        }
        socketIdsInRoom.push(socketId);
      }
    }
    // 방에 남은 유저가 있는지 체크
    const remainingUserIds = new Set<string>();
    for (const socketId of socketIdsInRoom) {
      const session = socketSessions.get(socketId);
      if (session?.userId) remainingUserIds.add(session.userId);
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

    const roomState = this.getRoomState(roomId);
    const hand = roomState.hands.get(userId);
    if (!hand) throw new Error('User hand not found');
    const deck = roomState.decks.get(userId);
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
    roomState.hands.set(userId, [...hand]); // 복사본 저장
    roomState.decks.set(userId, [...deck]); // 복사본 저장

    this.logger.log(`[discardAndDraw] userId=${userId}, roomId=${roomId}, discarded=${discarded.length}, newCount=${newCount}, remainingDiscards=${remainingDiscards}`);

    return { newHand: [...hand], discarded: [...discarded], remainingDiscards };
  }

  handPlayReady(roomId: string, userId: string, playCards: Card[]): void {
    this.getRoomState(roomId).handPlayMap.set(userId, playCards);
    this.logger.log(
      `[handPlayReady] userId=${userId}, roomId=${roomId}, playCards=${JSON.stringify(playCards)}`,
    );
  }

  canRevealHandPlay(roomId: string, userIds: string[]): boolean {
    const roomState = this.getRoomState(roomId);
    const handMap = roomState.handPlayMap;

    // playing 상태인 유저들만 필터링
    const playingUsers = this.getPlayingUserIds(roomId, userIds);

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
      `[canRevealHandPlay] roomId=${roomId}, allReady=${allReady}, playingUsers=${playingUsers.join(',')}, submitted=${Array.from(handMap.keys()).join(',')}`,
    );
    return allReady;
  }

  getAllHandPlayCards(roomId: string): { userId: string; playCards: Card[] }[] {
    const roomState = this.getRoomState(roomId);
    const result: { userId: string; playCards: Card[] }[] = [];
    for (const [userId, playCards] of roomState.handPlayMap.entries()) {
      result.push({ userId, playCards: [...playCards] });
    }
    this.logger.log(
      `[getAllHandPlayCards] roomId=${roomId}, result=${JSON.stringify(result)}`,
    );
    return result;
  }

  setNextRoundReady(roomId: string, userId: string): void {
    this.getRoomState(roomId).nextRoundReadySet.add(userId);
    this.logger.log(`[nextRoundReady] userId=${userId}, roomId=${roomId}`);
  }

  canStartNextRound(roomId: string): boolean {
    const roomState = this.getRoomState(roomId);
    const readySet = roomState.nextRoundReadySet;
    const userIds = this.getRoomUserIds(roomId);

    // playing 상태인 유저들만 필터링
    const playingUsers = this.getPlayingUserIds(roomId, userIds);

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
      `[canStartNextRound] roomId=${roomId}, allReady=${allReady}, playingUsers=${playingUsers.join(',')}, ready=${Array.from(readySet).join(',')}`,
    );
    return allReady;
  }

  // 현재 라운드 샵 카드 5장 반환
  getShopCards(roomId: string): string[] {
    const roomState = this.getRoomState(roomId);
    return roomState.shopCards.map(card => card.id);
  }

  // 다시뽑기 카드 5장 반환 (유저별로 관리, 같은 방의 다른 유저가 이미 있으면 복사)
  getReRollCards(roomId: string, userId: string): (SpecialCardData)[] {
    const roomState = this.getRoomState(roomId);
    const roomReRollCards = roomState.reRollCardsMap;

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
    const usedJokerSet = roomState.usedJokerCardIds;
    const reRollCardsRaw: SpecialCardData[] = this.specialCardManagerService.getRandomShopCards(5, usedJokerSet);

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    reRollCardsRaw.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        usedJokerSet.add(card.id);
        this.logger.log(`[getReRollCards] 조커카드 ${card.id}를 usedJokerSet에 추가: roomId=${roomId}, userId=${userId}`);
      }
    });

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

      const roomState = this.getRoomState(roomId);

      // 1. cardId로 카드 데이터 조회
      const cardInfo = this.specialCardManagerService.getCardById(cardId);
      if (!cardInfo) {
        this.logger.warn(
          `[buyCard] cardId=${cardId}인 카드를 찾을 수 없습니다.`,
        );
        return { success: false, message: TranslationKeys.InvalidCardId };
      }

      // 2. 샵 카드 목록에서 해당 카드 찾기 (공통 풀) - 먼저 shopCards에서 찾고, 없으면 reRollCardsMap에서 찾기
      let shopCard = roomState.shopCards.find((card) => card.id === cardId);

      // shopCards에서 찾지 못한 경우 reRollCardsMap에서 찾기
      if (!shopCard) {
        const userReRollCards = roomState.reRollCardsMap.get(userId);
        if (userReRollCards) {
          shopCard = userReRollCards.find((card) => card.id === cardId);
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
        return { success: false, message: TranslationKeys.InvalidCardId };
      }
      // 3. 조커 카드인 경우에만 개수 제한 및 중복 구매 방지 체크
      if (this.specialCardManagerService.isJokerCard(cardId)) {
        const ownedCards = this.getUserOwnedCards(roomId, userId);
        const ownedJokerCount = ownedCards.filter(card => this.specialCardManagerService.isJokerCard(card.id)).length;
        if (ownedJokerCount >= 5) {
          this.logger.warn(
            `[buyCard] userId=${userId}는 이미 조커카드를 5장 보유 중. 구매 불가.`,
          );
          return {
            success: false,
            message: TranslationKeys.JokerLimitExceeded,
          };
        } else {
          this.logger.log(`[buyCard] 구매 시도 조커 갯수: ${ownedJokerCount}`);
        }
        // 4. 이미 소유한 조커인지 확인 (중복 구매 방지)
        if (ownedCards.some(card => card.id === cardId)) {
          this.logger.warn(
            `[buyCard] userId=${userId}는 이미 cardId=${cardId} 조커를 보유 중. 중복 구매 불가.`,
          );
          return {
            success: false,
            message: TranslationKeys.JokerAlreadyOwned,
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
          message: TranslationKeys.InsufficientFundsForCard,
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
        const userCards = roomState.userOwnedCardsMap.get(userId) ?? [];
        const newCard = this.specialCardManagerService.createCardById(cardId);
        if (newCard) {
          userCards.push(newCard);
          roomState.userOwnedCardsMap.set(userId, userCards);
          this.logger.log(`[buyCard] userId=${userId}의 조커 카드 ${cardId}를 userOwnedCardsMap에 추가했습니다.`);
        } else {
          this.logger.warn(`[buyCard] 조커 카드 ${cardId}를 생성할 수 없습니다.`);
        }
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
          const userTarotCards = roomState.userTarotCardsMap.get(userId) ?? [];
          const newCard = this.specialCardManagerService.createCardById(cardId);
          if (newCard) {
            userTarotCards.push(newCard);
          } else {
            this.logger.warn(`[buyCard] 타로 카드 ${cardId}를 생성할 수 없습니다.`);
          }
          roomState.userTarotCardsMap.set(userId, userTarotCards);
          this.logger.log(`[buyCard] userId=${userId}의 타로 카드 ${cardId}를 userTarotCardsMap에 추가했습니다.`);

          // 유저의 수정된 덱이 있는지 확인
          let modifiedDeck: Card[];
          const userDeckModifications = roomState.userDeckModifications.get(userId);

          if (userDeckModifications) {
            // 이미 수정된 덱이 있으면 그것을 사용
            modifiedDeck = [...userDeckModifications];
            this.logger.log(`[buyCard] userId=${userId}의 기존 수정된 덱을 사용합니다.`);
          } else {
            // 수정된 덱이 없으면 새로 생성
            modifiedDeck = shuffle(createDeck());
            this.logger.log(`[buyCard] userId=${userId}의 새 덱을 생성합니다.`);
          }

          // 수정된 덱을 저장
          roomState.userDeckModifications.set(userId, modifiedDeck);
          this.logger.log(`[buyCard] userId=${userId}의 덱이 수정되어 저장되었습니다.`);

          // 수정된 덱의 앞 8장 반환
          firstDeckCards = modifiedDeck.slice(0, 8);

          // firstDeckCards를 서버에도 저장
          roomState.userFirstDeckCardsMap.set(userId, [...firstDeckCards]);
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
        message: TranslationKeys.CardPurchaseCompleted,
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
      return { success: false, message: TranslationKeys.PurchaseFailed };
    }
  }

  getUserOwnedCards(
    roomId: string,
    userId: string,
  ): SpecialCardData[] {
    const roomState = this.getRoomState(roomId);
    return roomState.userOwnedCardsMap.get(userId) ?? [];
  }

  getRound(roomId: string): number {
    return this.getRoomState(roomId).round;
  }

  // === 기본 seed 칩 (고정값) ===
  getBaseSeedAmount(roomId: string): number {
    return this.getRoomState(roomId).chipSettings.seedAmount;
  }

  getBaseBettingAmount(roomId: string): number {
    return this.getRoomState(roomId).chipSettings.bettingAmount;
  }

  getCurrentBettingAmount(roomId: string): number {
    return this.getRoomState(roomId).currentBettingAmount;
  }

  // === 실시간 seed 칩 (변동값) ===
  getBettingAmount(roomId: string): number {
    return this.getRoomState(roomId).currentBettingAmount;
  }

  // === 실시간 seed 칩 업데이트 ===
  updateBettingAmount(roomId: string, amount: number): void {
    const roomState = this.getRoomState(roomId);
    const prevValue = roomState.currentBettingAmount;
    roomState.currentBettingAmount = Math.max(0, roomState.currentBettingAmount + amount);
    this.logger.log(
      `[updateBettingAmount] roomId=${roomId}, currentBettingAmount: ${prevValue} -> ${roomState.currentBettingAmount} (${amount >= 0 ? '+' : ''}${amount})`
    );
  }

  // === 라운드 시작 시 실시간 seed 칩을 기본값으로 리셋 ===
  resetBettingChips(roomId: string): void {
    const roomState = this.getRoomState(roomId);
    roomState.currentBettingAmount = 0;
    this.logger.log(
      `[resetBettingChips] roomId=${roomId}, currentBettingAmount: 0`
    );
  }

  // === [4] 유저별 칩 정보 관리 메서드들 ===

  /**
   * 유저의 칩 정보를 초기화합니다. (DB에서 실제 칩 정보를 가져와서 메모리에 저장)
   */
  async initializeUserChips(roomId: string, userId: string): Promise<void> {
    try {
      const dbChips = await this.userService.getUserChips(userId);
      if (
        dbChips == null ||
        dbChips.silverChip == null ||
        dbChips.goldChip == null
      ) {
        this.logger.error(
          `[initializeUserChips] DB에서 칩 정보를 가져올 수 없습니다: userId=${userId}`,
        );
        return;
      }

      const roomState = this.getRoomState(roomId);
      const chipType = roomState.chipSettings.chipType;

      // DB의 칩 정보를 현재 방의 칩 타입에 맞게 변환
      const chips = chipType === ChipType.SILVER ? dbChips.silverChip : dbChips.goldChip;

      roomState.userChipsMap.set(userId, {
        chips: chips,
        funds: 0, // funds는 별도로 초기화
      });
    } catch (error) {
      this.logger.error(
        `[initializeUserChips] Error initializing user chips: userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * 유저의 칩 정보를 가져옵니다. (메모리에 없으면 DB에서 조회 후 메모리에 저장)
   */
  async getUserChips(
    roomId: string,
    userId: string,
  ): Promise<{ chips: number; funds: number }> {
    const roomState = this.getRoomState(roomId);
    if (roomState.userChipsMap.has(userId)) return roomState.userChipsMap.get(userId)!;

    // 메모리에 없으면 DB에서 가져와서 초기화
    await this.initializeUserChips(roomId, userId);
    return roomState.userChipsMap.get(userId) || { chips: 0, funds: 0 };
  }

  /**
   * 유저의 칩 정보를 동기적으로 가져옵니다. (메모리에 있는 경우만)
   */
  getUserChipsSync(
    roomId: string,
    userId: string,
  ): { chips: number; funds: number } | undefined {
    const roomState = this.getRoomState(roomId);
    return roomState.userChipsMap.get(userId);
  }

  /**
   * 유저의 칩 정보를 업데이트합니다.
   */
  async updateUserChips(
    roomId: string,
    userId: string,
    chipsChange: number = 0,
    fundsChange: number = 0,
  ): Promise<boolean> {
    const currentChips = await this.getUserChips(roomId, userId);

    // 차감하려는 경우 칩이 부족한지 확인
    if (chipsChange < 0 && currentChips.chips + chipsChange < 0) {
      this.logger.warn(
        `[updateUserChips] 칩 부족: userId=${userId}, current=${currentChips.chips}, required=${Math.abs(chipsChange)}`
      );
      return false;
    }

    if (fundsChange < 0 && currentChips.funds + fundsChange < 0) {
      this.logger.warn(
        `[updateUserChips] funds 부족: userId=${userId}, current=${currentChips.funds}, required=${Math.abs(fundsChange)}`
      );
      return false;
    }

    const newChips = {
      chips: Math.max(0, currentChips.chips + chipsChange),
      funds: Math.max(0, currentChips.funds + fundsChange),
    };

    const roomState = this.getRoomState(roomId);
    roomState.userChipsMap.set(userId, newChips);

    this.logger.log(
      `[updateUserChips] roomId=${roomId}, userId=${userId}, ` +
      `chips: ${currentChips.chips} -> ${newChips.chips} (${chipsChange >= 0 ? '+' : ''}${chipsChange}), ` +
      `funds: ${currentChips.funds} -> ${newChips.funds} (${fundsChange >= 0 ? '+' : ''}${fundsChange})`
    );

    return true;
  }

  async updateUserFunds(
    roomId: string,
    userId: string,
    fundsChange: number = 0,
  ): Promise<boolean> {
    const currentChips = await this.getUserChips(roomId, userId);

    if (fundsChange < 0 && currentChips.funds + fundsChange < 0) {
      this.logger.warn(
        `[updateUserFunds] funds 부족: userId=${userId}, current=${currentChips.funds}, required=${Math.abs(fundsChange)}`
      );
      return false;
    }

    const newChips = {
      chips: currentChips.chips, // 칩은 변경하지 않음
      funds: Math.max(0, currentChips.funds + fundsChange),
    };

    const roomState = this.getRoomState(roomId);
    roomState.userChipsMap.set(userId, newChips);

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
  ): Record<string, { chips: number; funds: number }> {
    const roomState = this.getRoomState(roomId);
    const result: Record<
      string,
      { chips: number; funds: number }
    > = {};
    for (const [userId, chips] of roomState.userChipsMap.entries()) {
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
      const ownedCards = this.getUserOwnedCards(roomId, userId);
      const cardIndex = ownedCards.findIndex(card => card.id === cardId);

      if (cardIndex === -1) {
        this.logger.warn(
          `[sellCard] 카드를 찾을 수 없음: userId=${userId}, cardId=${cardId}`,
        );
        return { success: false, message: TranslationKeys.CardNotOwned };
      }

      // 2. 실제 카드 객체 가져오기 (userOwnedCardsMap에서)
      const roomState = this.getRoomState(roomId);
      const userCards = roomState.userOwnedCardsMap.get(userId) ?? [];
      const soldCard = userCards[cardIndex];
      const cardPrice = Math.floor(soldCard.price * 0.5);
      this.logger.log(
        `[sellCard] 판매할 카드 발견: cardName=${soldCard.name}, price=${cardPrice}`,
      );

      // 3. 카드 제거
      userCards.splice(cardIndex, 1);
      roomState.userOwnedCardsMap.set(userId, userCards);

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
        message: TranslationKeys.CardSaleCompleted,
        soldCardId: soldCard.id,
        funds: updatedUserChips.funds,
      };
    } catch (error) {
      this.logger.error(
        `[sellCard] Error in sellCard: roomId=${roomId}, userId=${userId}, cardId=${cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: TranslationKeys.SaleFailed };
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
      const roomState = this.getRoomState(roomId);
      const userCards = roomState.userOwnedCardsMap.get(userId);
      if (!userCards) {
        this.logger.warn(
          `[reorderJokers] 유저의 조커 카드를 찾을 수 없음: userId=${userId}`,
        );
        return { success: false, message: TranslationKeys.JokerNotFound };
      }

      // 2. 현재 보유한 조커 ID 목록
      const currentJokerIds = userCards.map((card: SpecialCardData) => card.id);

      // 3. 요청된 조커 ID들이 모두 보유한 조커인지 확인
      for (const jokerId of jokerIds) {
        if (!currentJokerIds.includes(jokerId)) {
          this.logger.warn(
            `[reorderJokers] 보유하지 않은 조커 ID: userId=${userId}, jokerId=${jokerId}`,
          );
          return { success: false, message: TranslationKeys.JokerNotOwned };
        }
      }

      // 4. 조커 개수가 일치하는지 확인
      if (jokerIds.length !== currentJokerIds.length) {
        this.logger.warn(
          `[reorderJokers] 조커 개수 불일치: userId=${userId}, requested=${jokerIds.length}, owned=${currentJokerIds.length}`,
        );
        return { success: false, message: TranslationKeys.JokerCountMismatch };
      }

      // 5. 새로운 순서로 조커 배열 재구성
      const reorderedJokers: SpecialCardData[] = [];
      for (const jokerId of jokerIds) {
        const joker = userCards.find((card: SpecialCardData) => card.id === jokerId);
        if (joker) {
          reorderedJokers.push(joker);
        }
      }

      // 6. 기존 배열을 새로운 순서로 교체
      roomState.userOwnedCardsMap.set(userId, reorderedJokers);

      this.logger.log(
        `[reorderJokers] 순서 변경 완료: userId=${userId}, newOrder=${JSON.stringify(reorderedJokers.map(card => card.id))}`,
      );

      return {
        success: true,
        message: TranslationKeys.JokerOrderChanged,
        userId: userId,
        jokerIds: reorderedJokers.map(card => card.id),
      };
    } catch (error) {
      this.logger.error(
        `[reorderJokers] Error in reorderJokers: roomId=${roomId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: TranslationKeys.JokerOrderChangeFailed };
    }
  }

  /**
   * 라운드 종료 처리를 합니다.
   */
  async handleRoundEnd(roomId: string, userIds: string[]) {
    const round = this.getRound(roomId) + 1;

    if (round > 5) {
      // 5라운드 종료 후 게임 종료 처리
      await this.handleGameEnd(roomId);
      this.logger.log(`[handleRoundEnd] 5라운드 완료 - 게임 상태 초기화 완료: roomId=${roomId}`);
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
    currentSeedAmount?: number;
    currentBettingAmount?: number;
  }> {
    try {
      this.logger.log(
        `[handleBetting] 베팅 시도: roomId=${roomId}, userId=${userId}`,
      );

      // 1. 이미 베팅했는지 확인
      const roomState = this.getRoomState(roomId);
      if (roomState.bettingSet.has(userId)) {
        this.logger.warn(
          `[handleBetting] 이미 베팅한 유저: roomId=${roomId}, userId=${userId}`,
        );
        return {
          success: false,
          message: TranslationKeys.AlreadyBetting
        };
      }

      // 2. 기본 seed 칩 값 가져오기
      const baseBettingAmount = this.getBaseBettingAmount(roomId);

      // 3. 현재 베팅 칩 증가
      if (baseBettingAmount > 0) {
        this.updateBettingAmount(roomId, baseBettingAmount);
      }

      // 4. 베팅 상태 기록
      roomState.bettingSet.add(userId);

      // 5. 업데이트된 현재 베팅 칩 값 가져오기
      const bettingAmount = this.getBettingAmount(roomId);

      this.logger.log(
        `[handleBetting] 베팅 완료: roomId=${roomId}, userId=${userId}, ` +
        `bettingAmount=${bettingAmount}`,
      );

      return {
        success: true,
        message: TranslationKeys.BettingCompleted,
        currentBettingAmount: bettingAmount,
      };
    } catch (error) {
      this.logger.error(
        `[handleBetting] Error in handleBetting: roomId=${roomId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, message: TranslationKeys.BettingFailed };
    }
  }

  /**
   * 방의 현재 phase를 반환합니다.
   */
  getRoomPhase(roomId: string): string | undefined {
    return this.getRoomState(roomId).phase;
  }

  /**
   * 방의 phase를 변경합니다.
   */
  setRoomPhase(roomId: string, phase: 'waiting' | 'playing' | 'shop'): void {
    this.getRoomState(roomId).phase = phase;
  }

  /**
   * 유저의 타로 카드 소유 여부를 확인합니다.
   */
  hasUserTarotCard(roomId: string, userId: string, cardId: string): boolean {
    const roomState = this.getRoomState(roomId);
    const userTarotCards = roomState.userTarotCardsMap.get(userId) ?? [];
    return userTarotCards.some(card => card.id === cardId);
  }

  /**
   * 유저의 firstDeckCards를 반환합니다.
   */
  getUserFirstDeckCards(roomId: string, userId: string): Card[] {
    const roomState = this.getRoomState(roomId);
    return roomState.userFirstDeckCardsMap.get(userId) ?? [];
  }

  /**
   * 유저의 handPlay 상태를 확인합니다.
   */
  hasUserHandPlay(roomId: string, userId: string): boolean {
    const roomState = this.getRoomState(roomId);
    return roomState.handPlayMap.has(userId);
  }

  /**
   * 유저의 덱 정보를 반환합니다.
   */
  getUserDeckInfo(roomId: string, userId: string): { remainingDeck: number; remainingSevens: number } {
    const roomState = this.getRoomState(roomId);
    const deck = roomState.decks.get(userId);
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
    const roomState = this.getRoomState(roomId);
    return roomState.discardCountMap.get(userId) || 0;
  }

  // 유저의 버리기 횟수 증가
  incrementUserDiscardCount(roomId: string, userId: string): number {
    const roomState = this.getRoomState(roomId);
    const currentCount = roomState.discardCountMap.get(userId) || 0;
    const newCount = currentCount + 1;
    roomState.discardCountMap.set(userId, newCount);

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
    this.getRoomState(roomId).discardCountMap.clear();
    this.logger.log(`[resetDiscardCounts] roomId=${roomId}의 버리기 횟수 초기화`);
  }

  // 방의 모든 유저 버리기 횟수 가져오기
  getDiscardCountMap(roomId: string): Map<string, number> {
    return this.getRoomState(roomId).discardCountMap;
  }

  // 시드머니 납부 관련 헬퍼 메서드들
  getUserSeedMoneyPayment(roomId: string, userId: string): { payment: number; funds: number } {
    const roomState = this.getRoomState(roomId);
    return roomState.userSeedMoneyPayments.get(userId) || { payment: 0, funds: 0 };
  }

  getAllUserSeedMoneyPayments(roomId: string): Map<string, { payment: number; funds: number }> {
    return this.getRoomState(roomId).userSeedMoneyPayments;
  }

  resetSeedMoneyPayments(roomId: string): void {
    this.getRoomState(roomId).userSeedMoneyPayments.clear();
  }

  /**
   * 시드머니 납부 기록에서 분배로 빠져나간 금액을 감소시킵니다.
   */
  updateSeedMoneyPayment(roomId: string, userId: string, chipsReduction: number, fundsReduction: number): void {
    const roomState = this.getRoomState(roomId);
    const userPayment = roomState.userSeedMoneyPayments.get(userId);
    if (!userPayment) {
      this.logger.warn(`[updateSeedMoneyPayment] userId=${userId}에 대한 시드머니 납부 기록이 없습니다.`);
      return;
    }

    // 분배로 빠져나간 금액만큼 감소
    userPayment.payment = Math.max(0, userPayment.payment - chipsReduction);
    userPayment.funds = Math.max(0, userPayment.funds - fundsReduction);

    this.logger.log(
      `[updateSeedMoneyPayment] ${userId} 시드머니 납부 기록 업데이트: ` +
      `감소량(chips=${chipsReduction}, funds=${fundsReduction}), ` +
      `남은금액(chips=${userPayment.payment}, funds=${userPayment.funds})`
    );
  }

  /**
   * 현재 테이블의 총 칩을 계산합니다.
   */
  getCurrentTableChips(roomId: string): { chips: number; funds: number } {
    const roomState = this.getRoomState(roomId);
    let totalChips = 0;
    let totalFunds = 0;

    for (const payment of roomState.userSeedMoneyPayments.values()) {
      totalChips += payment.payment;
      totalFunds += payment.funds;
    }

    return {
      chips: totalChips,
      funds: totalFunds
    };
  }

  /**
   * 라운드별 최대 상금을 설정합니다.
   */
  setRoundMaxPrizes(roomId: string, maxPrizes: number[]): void {
    if (maxPrizes.length !== 5) {
      throw new Error('라운드별 최대 상금은 5개(1~5라운드)여야 합니다.');
    }
    this.getRoomState(roomId).roundMaxPrizes = [...maxPrizes];
    this.logger.log(`[setRoundMaxPrizes] roomId=${roomId}, maxPrizes=${maxPrizes.join(', ')}`);
  }

  /**
   * 특정 라운드의 최대 상금을 가져옵니다.
   */
  getRoundMaxPrize(roomId: string, round: number): number {
    const roomState = this.getRoomState(roomId);
    if (round < 1 || round > 5) {
      // 기본값: 라운드 번호 그대로 반환 (1, 2, 3, 4, 5)
      return round;
    }

    const baseMaxPrize = roomState.roundMaxPrizes[round - 1];

    // 베팅금액이 있으면 더해주기
    const currentBettingAmount = this.getBettingAmount(roomId);

    let additionalBettingAmount = 0;
    if (currentBettingAmount > 0) {
      additionalBettingAmount = currentBettingAmount;
    }

    const totalMaxPrize = baseMaxPrize + additionalBettingAmount;

    this.logger.log(
      `[getRoundMaxPrize] roomId=${roomId}, round=${round}, ` +
      `baseMaxPrize=${baseMaxPrize}, ` +
      `additionalBettingAmount=${additionalBettingAmount}, totalMaxPrize=${totalMaxPrize}`
    );

    return totalMaxPrize;
  }

  /**
   * 모든 라운드의 최대 상금을 가져옵니다.
   */
  getAllRoundMaxPrizes(roomId: string): number[] {
    const roomState = this.getRoomState(roomId);
    return [...roomState.roundMaxPrizes];
  }

  /**
   * 게임 종료 및 새 게임 시작을 처리하는 공통 함수
   * - handleRoundEnd의 5라운드 종료 시
   * - handleFold의 마지막 1명 남았을 때
   * 위 두 경우에서 사용됨
   */
  private async handleGameEnd(
    roomId: string,
    lastWinnerId?: string,
    rewards?: { chips: number; funds: number }
  ): Promise<void> {
    const roomState = this.getRoomState(roomId);
    const userIds = await this.getUserIdsInRoom(roomId);

    // 1. 모든 사용자의 칩 정보를 DB에 저장
    for (const userId of userIds) {
      await this.saveUserChipsOnLeave(roomId, userId);
    }

    // 2. 게임 상태 초기화
    roomState.resetGameStateForNewGame();
    this.setAllUsersToWaiting(roomId, userIds);
    this.setRoomPhase(roomId, 'waiting');
  }

  /**
   * 마지막 플레이어 보상 계산 및 지급
   */
  /**
   * 방에 있는 모든 유저 ID를 가져옵니다.
   */
  private async getUserIdsInRoom(roomId: string): Promise<string[]> {
    const client = this.redisService.getClient();
    const usersKey = `room:${roomId}:users`;
    return await client.smembers(usersKey);
  }



  private async calculateLastPlayerRewards(
    roomId: string,
    lastPlayerId: string
  ): Promise<{ chips: number; funds: number }> {
    const roomState = this.getRoomState(roomId);

    // 시드머니 합산
    let totalChips = 0;
    let totalFunds = 0;
    roomState.userSeedMoneyPayments.forEach((payment) => {
      totalChips += payment.payment;
      totalFunds += payment.funds;
    });

    // 마지막 남은 유저에게 시드머니 지급
    await this.updateUserChips(roomId, lastPlayerId, totalChips, totalFunds);

    return {
      chips: totalChips,
      funds: totalFunds
    };
  }

  /**
   * 방 생성 시 기본 라운드별 최대 상금을 설정합니다.
   */
  async initializeRoundMaxPrizes(roomId: string): Promise<void> {
    try {
      // dev-tools의 칩 설정에서 라운드별 상금 가져오기
      const chipSettings = await this.prisma.gameSetting.findFirst({
        where: { id: 'chipSettings', isActive: true }
      });

      if (chipSettings && chipSettings.value) {
        const chipData = JSON.parse(chipSettings.value);
        if (chipData.roundPrizes && Array.isArray(chipData.roundPrizes)) {
          this.getRoomState(roomId).roundMaxPrizes = [...chipData.roundPrizes];
          this.logger.log(`[initializeRoundMaxPrizes] roomId=${roomId}, 칩 설정에서 가져온 라운드별 상금: ${chipData.roundPrizes.join(', ')}`);
          return;
        }
      }

      // 칩 설정이 없거나 유효하지 않으면 기본값 사용
      this.getRoomState(roomId).roundMaxPrizes = [1, 2, 3, 4, 5];
      this.logger.log(`[initializeRoundMaxPrizes] roomId=${roomId}, 기본값 설정 완료`);
    } catch (error) {
      // 오류 발생 시 기본값 사용
      this.getRoomState(roomId).roundMaxPrizes = [1, 2, 3, 4, 5];
      this.logger.error(`[initializeRoundMaxPrizes] 오류 발생, 기본값 사용: roomId=${roomId}`, error);
    }
  }

  /**
   * 방에서 퇴장할 때 유저의 칩 정보를 DB에 저장합니다.
   */
  async saveUserChipsOnLeave(roomId: string, userId: string): Promise<boolean> {
    try {
      const roomState = this.getRoomState(roomId);
      const userChips = roomState.userChipsMap.get(userId);
      if (!userChips) {
        this.logger.warn(`[saveUserChipsOnLeave] userChips not found: roomId=${roomId}, userId=${userId}`);
        return false;
      }

      // 현재 DB에 저장된 칩 정보 가져오기
      const currentDbChips = await this.userService.getUserChips(userId);
      const chipType = roomState.chipSettings.chipType;

      // 칩 타입에 따라 적절한 칩 정보 업데이트
      let silverChip = currentDbChips.silverChip;
      let goldChip = currentDbChips.goldChip;

      if (chipType === ChipType.SILVER) {
        silverChip = userChips.chips;  // 실버 칩 타입인 경우 실버 칩만 업데이트
      } else if (chipType === ChipType.GOLD) {
        goldChip = userChips.chips;    // 골드 칩 타입인 경우 골드 칩만 업데이트
      }

      // funds는 DB에 저장하지 않음 (게임 중에만 사용)

      const success = await this.userService.saveUserChips(
        userId,
        silverChip,
        goldChip
      );

      if (success) {
        this.logger.log(
          `[saveUserChipsOnLeave] 칩 정보 저장 성공: roomId=${roomId}, userId=${userId}, ` +
          `chipType=${chipType}, chips=${userChips.chips}, funds=${userChips.funds}, ` +
          `DB_silverChip=${silverChip}, DB_goldChip=${goldChip}`
        );
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
      const roomState = this.getRoomState(roomId);

      // 1. 카드 정보 가져오기
      const cardInfo = this.specialCardManagerService.getCardById(cardId);
      if (!cardInfo) {
        this.logger.warn(`[processUseSpecialCard] 존재하지 않는 카드: userId=${userId}, cardId=${cardId}`);
        return {
          success: false,
          message: TranslationKeys.CardNotExists
        };
      }

      this.logger.log(`[processUseSpecialCard] 카드 정보: userId=${userId}, cardId=${cardId}, name=${cardInfo.name}, description=${cardInfo.description}, needCardCount=${cardInfo.needCardCount}`);

      // 2. 카드 개수 검증
      if (cardInfo.needCardCount && cards.length > cardInfo.needCardCount) {
        this.logger.warn(`[processUseSpecialCard] 카드 개수 초과: userId=${userId}, cardId=${cardId}, selected=${cards.length}, required=${cardInfo.needCardCount}`);
        return {
          success: false,
          message: TranslationKeys.TooManyCardsSelected
        };
      }

      // 3. 타로 카드 소유 여부 확인
      if (!this.hasUserTarotCard(roomId, userId, cardId)) {
        this.logger.warn(`[processUseSpecialCard] 유효하지 않은 타로 카드: userId=${userId}, cardId=${cardId}`);
        return {
          success: false,
          message: TranslationKeys.TarotCardNotPurchased
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
          message: TranslationKeys.InvalidCardCombination
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
          const roomState = this.getRoomState(roomId);
          const modifiedDeck = roomState.userDeckModifications.get(userId);
          if (modifiedDeck) {
            this.logger.log(`\x1b[33m  🗑️  tarot_8 덱에서 삭제 시작: ${cards.map(c => `${c.suit}_${c.rank}`).join(', ')}\x1b[0m`);
            this.logger.log(`\x1b[33m  📊 삭제 전 덱 크기: ${modifiedDeck.length}\x1b[0m`);

            cards.forEach(card => {
              const deckIndex = modifiedDeck.findIndex((deckCard: Card) =>
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
      const modifiedDeck = roomState.userDeckModifications.get(userId);
      if (modifiedDeck) {
        this.logger.log(`[processUseSpecialCard] modifiedDeck 수정 시작: userId=${userId}, deckSize=${modifiedDeck.length}`);

        for (let i = 0; i < selectedCards.length && i < resultCards.length; i++) {
          const selectedCard = selectedCards[i];
          const resultCard = resultCards[i];

          // modifiedDeck에서 해당 카드 찾기
          const deckIndex = modifiedDeck.findIndex((card: Card) =>
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
        message: TranslationKeys.SpecialCardUseCompleted,
        selectedCards,
        resultCards
      };
    } catch (error) {
      this.logger.error(`[processUseSpecialCard] Error: userId=${userId}, cardId=${cardId}`, error);
      return {
        success: false,
        message: TranslationKeys.SpecialCardUseFailed
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
      const roomState = this.getRoomState(roomId);
      const allHandPlayCards = roomState.handPlayMap;

      if (!allHandPlayCards || allHandPlayCards.size === 0) {
        this.logger.error(`[processHandPlayResult] allHandPlayCards not found: roomId=${roomId}`);
        return {
          roundResult: {},
          shopCards: [],
          round: 0
        };
      }

      // 각 유저의 funds 변화를 추적하기 위한 맵
      const fundsBeforeMap: Map<string, number> = new Map();

      const ownedCards: Record<string, string[]> = {};
      for (const uid of userIds) {
        ownedCards[uid] = this.getUserOwnedCards(roomId, uid).map(card => card.id);

        // funds 변화 추적을 위해 현재 funds 저장
        const currentChips = await this.getUserChips(roomId, uid);
        fundsBeforeMap.set(uid, currentChips.funds);
      }

      // playing 상태인 유저들의 점수 계산
      const { userScores } = await this.calculateUserScores(roomId, userIds, allHandPlayCards, ownedCards);

      // 승자 판정 및 시드머니 분배 계산
      const { winners, maxScore, allScores } = this.determineWinners(userIds, userScores);

      // 전체 시드머니 납부 금액 계산
      const allPayments = this.getAllUserSeedMoneyPayments(roomId);
      let totalChips = 0;
      let totalFunds = 0;

      for (const [uid, payment] of allPayments.entries()) {
        totalChips += payment.payment;
        totalFunds += payment.funds;
      }

      this.logger.log(
        `[processHandPlayResult] 시드머니 분배 준비: ` +
        `전체시드머니(chips=${totalChips}, funds=${totalFunds}), ` +
        `승자수=${winners.length}, ` +
        `점수분포=${JSON.stringify(allScores.map(s => ({ userId: s.userId, score: s.score })))}`
      );

      // 각 유저별 결과 처리
      const roundResult: Record<string, any> = {};
      // 라운드 종료 시 시드머니 납부 기록을 일괄 차감하기 위한 누적 맵
      const seedPaymentReductions: Map<string, { chips: number; funds: number }> = new Map();


      for (const userId of userIds) {
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
        let chipsGain = 0;
        let fundsGain = 0;
        let isWinner = -1;

        // 현재 라운드의 최대 상금 가져오기
        const roundNumber = this.getRound(roomId);
        const roundMaxPrize = this.getRoundMaxPrize(roomId, roundNumber);

        if (winners.length > 0 && winners.some(w => w.userId === userId)) {
          isWinner = 1;

          // 승자인 경우
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자인 경우
            // 각 패자에게서 가져올 수 있는 금액 = min(자신이낸금액, 패자가낸금액, 라운드별최대상금)
            let totalChipsFromLosers = 0;
            let totalFundsFromLosers = 0;

            // 시드머니를 납부한 유저 ID들로 for문 돌기
            for (const [uid, payment] of allPayments) {
              if (uid !== userId) { // 패자들만
                const chipsFromThisLoser = Math.min(userPayment.payment, payment.payment, roundMaxPrize);
                const fundsFromThisLoser = Math.min(userPayment.funds, payment.funds, roundMaxPrize);

                totalChipsFromLosers += chipsFromThisLoser;
                totalFundsFromLosers += fundsFromThisLoser;
              }
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) + 패자들에게서 가져온 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            const limitedFunds = Math.min(userPayment.funds, roundMaxPrize);
            chipsGain = limitedChips + totalChipsFromLosers;
            fundsGain = limitedFunds + totalFundsFromLosers;
            // 일괄 차감을 위해 누적
            const prev1 = seedPaymentReductions.get(userId) || { chips: 0, funds: 0 };
            seedPaymentReductions.set(userId, { chips: prev1.chips + limitedChips, funds: prev1.funds + limitedFunds });


            this.logger.log(
              `[processHandPlayResult] ${userId} 단독 승자 분배: ` +
              `자신납부(chips=${userPayment.payment}, funds=${userPayment.funds}), ` +
              `패자들에게서받음(chips=${totalChipsFromLosers}, funds=${totalFundsFromLosers}), ` +
              `총획득(chips=${chipsGain}, funds=${fundsGain})`
            );
          } else {
            // 공동 승자인 경우
            // 각 승자는 자신이 납부한 금액만큼만 다른 유저들에게서 가져갈 수 있음
            let totalChipsFromLosers = 0;
            let totalFundsFromLosers = 0;

            // 시드머니를 납부한 유저 ID들로 for문 돌기
            for (const [uid, payment] of allPayments) {
              if (!winners.some(w => w.userId === uid)) { // 패자들만
                // 각 승자가 가져갈 수 있는 금액 = min(자신이낸금액, 패자가낸금액, 라운드별최대상금) / 승자수
                const chipsPerWinner = Math.min(userPayment.payment, payment.payment, roundMaxPrize) / winners.length;
                const fundsPerWinner = Math.min(userPayment.funds, payment.funds, roundMaxPrize) / winners.length;

                totalChipsFromLosers += chipsPerWinner;
                totalFundsFromLosers += fundsPerWinner;
              }
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) + 패자들에게서 가져온 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            const limitedFunds = Math.min(userPayment.funds, roundMaxPrize);
            chipsGain = limitedChips + totalChipsFromLosers;
            fundsGain = limitedFunds + totalFundsFromLosers;
            // 일괄 차감을 위해 누적
            const prev2 = seedPaymentReductions.get(userId) || { chips: 0, funds: 0 };
            seedPaymentReductions.set(userId, { chips: prev2.chips + limitedChips, funds: prev2.funds + limitedFunds });

            this.logger.log(
              `[processHandPlayResult] ${userId} 공동 승자 분배: ` +
              `자신납부(chips=${userPayment.payment}, funds=${userPayment.funds}), ` +
              `패자들에게서받음(chips=${totalChipsFromLosers}, funds=${totalFundsFromLosers}), ` +
              `총획득(chips=${chipsGain}, funds=${fundsGain})`
            );
          }
        } else {
          // 패자인 경우 - 자신이 납부한 시드머니에서 승자에게 빼앗긴 금액을 제외하고 돌려받음
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자가 있는 경우
            const winnerPayment = this.getUserSeedMoneyPayment(roomId, winners[0].userId);
            const takenByWinnerChips = Math.min(userPayment.payment, winnerPayment.payment, roundMaxPrize);
            const takenByWinnerFunds = Math.min(userPayment.funds, winnerPayment.funds, roundMaxPrize);

            // 자신이 낸 금액(라운드별 상금 제한 적용) - 승자에게 빼앗긴 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            const limitedFunds = Math.min(userPayment.funds, roundMaxPrize);
            chipsGain = limitedChips - takenByWinnerChips;
            fundsGain = limitedFunds - takenByWinnerFunds;
            // 일괄 차감을 위해 누적
            const prev3 = seedPaymentReductions.get(userId) || { chips: 0, funds: 0 };
            seedPaymentReductions.set(userId, { chips: prev3.chips + limitedChips, funds: prev3.funds + limitedFunds });

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불: ` +
              `자신납부(chips=${userPayment.payment}, funds=${userPayment.funds}), ` +
              `승자에게빼앗김(chips=${takenByWinnerChips}, funds=${takenByWinnerFunds}), ` +
              `환불량(chips=${chipsGain}, funds=${fundsGain})`
            );
          } else if (winners.length > 1) {
            // 공동 승자가 있는 경우
            let totalTakenChips = 0;
            let totalTakenFunds = 0;

            for (const winner of winners) {
              const winnerPayment = this.getUserSeedMoneyPayment(roomId, winner.userId);
              // 각 승자가 가져갈 수 있는 금액 = min(승자가낸금액, 패자가낸금액, 라운드별최대상금) / 승자수
              const chipsPerWinner = Math.min(winnerPayment.payment, userPayment.payment, roundMaxPrize) / winners.length;
              const fundsPerWinner = Math.min(winnerPayment.funds, userPayment.funds, roundMaxPrize) / winners.length;

              totalTakenChips += chipsPerWinner;
              totalTakenFunds += fundsPerWinner;
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) - 승자들에게 빼앗긴 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            const limitedFunds = Math.min(userPayment.funds, roundMaxPrize);
            chipsGain = limitedChips - totalTakenChips;
            fundsGain = limitedFunds - totalTakenFunds;
            // 일괄 차감을 위해 누적
            const prev4 = seedPaymentReductions.get(userId) || { chips: 0, funds: 0 };
            seedPaymentReductions.set(userId, { chips: prev4.chips + limitedChips, funds: prev4.funds + limitedFunds });

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불(공동승자): ` +
              `자신납부(chips=${userPayment.payment}, funds=${userPayment.funds}), ` +
              `승자들에게빼앗김(chips=${totalTakenChips}, funds=${totalTakenFunds}), ` +
              `환불량(chips=${chipsGain}, funds=${fundsGain})`
            );
          } else {
            isWinner = 0;
            // 승자가 없는 경우 (모든 점수가 0) - 라운드별 상금 제한 적용
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            const limitedFunds = Math.min(userPayment.funds, roundMaxPrize);
            chipsGain = limitedChips;
            fundsGain = limitedFunds;
            // 일괄 차감을 위해 누적
            const prev5 = seedPaymentReductions.get(userId) || { chips: 0, funds: 0 };
            seedPaymentReductions.set(userId, { chips: prev5.chips + limitedChips, funds: prev5.funds + limitedFunds });

            this.logger.log(
              `[processHandPlayResult] ${userId} 무승부 환불: ` +
              `자신납부(chips=${userPayment.payment}, funds=${userPayment.funds}), ` +
              `환불량(chips=${chipsGain}, funds=${fundsGain})`
            );
          }
        }

        // 유저 칩 업데이트
        const updateSuccess = await this.updateUserChips(
          roomId,
          userId,
          chipsGain,
          fundsGain
        );

        if (!updateSuccess) {
          this.logger.error(`[processHandPlayResult] 칩 업데이트 실패: userId=${userId}`);
          throw new Error('칩 업데이트 실패');
        }

        // 현재 라운드 정보 가져오기
        const currentRound = this.getRound(roomId);

        // 순위별 funds 지급 (동률 처리 포함)
        await this.distributeRankFunds(roomId, userIds, userScores, userId, currentRound);

        // 업데이트된 칩 정보 가져오기
        const finalUpdatedChips = await this.getUserChips(roomId, userId);

        this.logger.log(
          `[processHandPlayResult] ${userId} 결과: ` +
          `점수=${finalScore}, ` +
          `승자여부=${winners.some(w => w.userId === userId)}, ` +
          `획득량(chips=${chipsGain}, funds=${fundsGain}), ` +
          `최종(chips=${finalUpdatedChips.chips}, funds=${finalUpdatedChips.funds})`
        );

        roundResult[userId] = {
          isWinner: isWinner,
          usedHand: playedHand,
          fullHand: fullHand,
          score: finalScore,
          chipsGain: chipsGain,
          fundsGain: finalUpdatedChips.funds - (fundsBeforeMap.get(userId) ?? finalUpdatedChips.funds),
          finalChips: finalUpdatedChips.chips,
          finalFunds: finalUpdatedChips.funds,
          remainingDiscards,
          remainingDeck,
          remainingSevens,
          ownedCards: ownedCards[userId] || [],
        };
      }

      // 여기에서 시드머니 업데이트 기록 일괄 처리 할 것
      for (const [uid, reduce] of seedPaymentReductions.entries()) {
        this.updateSeedMoneyPayment(roomId, uid, reduce.chips, reduce.funds);
        this.logger.log(`[processHandPlayResult] 시드머니 납부 기록 일괄 차감: userId=${uid}, chips=${reduce.chips}, funds=${reduce.funds}`);
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
   * 승자를 판정합니다.
   */
  private determineWinners(
    userIds: string[],
    userScores: Record<string, number>
  ): {
    winners: Array<{ userId: string; score: number }>;
    maxScore: number;
    allScores: Array<{ userId: string; score: number }>
  } {
    const allScores = userIds.map(uid => ({ userId: uid, score: userScores[uid] || 0 }));
    const maxScore = Math.max(...allScores.map(s => s.score));
    const winners = allScores.filter(s => s.score === maxScore && s.score > 0);

    return { winners, maxScore, allScores };
  }

  /**
   * 순위별 funds를 지급합니다 (동률 처리 포함).
   */
  private async distributeRankFunds(
    roomId: string,
    userIds: string[],
    userScores: Record<string, number>,
    currentUserId: string,
    currentRound: number
  ): Promise<void> {
    // 모든 유저의 점수를 기준으로 순위 결정 (동률 처리 포함)
    const allUserScores = userIds.map(uid => ({ userId: uid, score: userScores[uid] || 0 }));
    const sortedUsers: Array<{ userId: string; score: number; rank?: number }> = allUserScores
      .sort((a, b) => b.score - a.score) // 점수 내림차순 정렬
      .slice(0, 4); // 상위 4명만

    // 점수별로 그룹화하여 동률 처리
    const scoreGroups: Array<Array<{ userId: string; score: number; rank?: number }>> = [];
    let currentScore = -1;
    let currentGroup: Array<{ userId: string; score: number; rank?: number }> = [];

    for (const user of sortedUsers) {
      if (user.score !== currentScore) {
        if (currentGroup.length > 0) {
          scoreGroups.push(currentGroup);
        }
        currentGroup = [user];
        currentScore = user.score;
      } else {
        currentGroup.push(user);
      }
    }
    scoreGroups.push(currentGroup);

    // 그룹별로 순위 할당 (같은 점수는 같은 순위)
    let rank = 1;
    for (const group of scoreGroups) {
      const groupRank = rank;
      for (const user of group) {
        user.rank = groupRank;
      }
      rank += group.length; // 다음 그룹의 순위는 현재 그룹 크기만큼 증가
    }

    // 현재 처리 중인 유저의 순위만 구해서 그 유저에게만 funds 지급
    const currentUser = sortedUsers.find(user => user.userId === currentUserId);
    if (currentUser && currentUser.rank) {
      const rankFunds = await this.gameSettingsService.getRoundRankFunds(currentRound, currentUser.rank);
      await this.updateUserFunds(roomId, currentUserId, rankFunds);

      this.logger.log(
        `[processHandPlayResult] 순위별 funds 지급: ` +
        `라운드=${currentRound}, 순위=${currentUser.rank}, 유저=${currentUserId}, 점수=${userScores[currentUserId]}, 지급funds=${rankFunds}`
      );
    }
  }

  /**
   * 유저들의 점수를 계산합니다.
   */
  private async calculateUserScores(
    roomId: string,
    userIds: string[],
    allHandPlayCards: Map<string, Card[]>,
    ownedCards: Record<string, string[]>
  ): Promise<{
    userScores: Record<string, number>;
  }> {
    const userScores: Record<string, number> = {};

    for (const userId of userIds) {
      // 남은 버리기 횟수 계산
      let remainingDiscards = 4;
      const discardUserMap = this.getDiscardCountMap(roomId);
      if (discardUserMap) {
        const used = discardUserMap.get(userId) ?? 0;
        remainingDiscards = 4 - used;
      }

      // 게임 설정에서 버리기 남은 횟수에 따른 지급 funds 값 가져오기
      if (remainingDiscards > 0) {
        const discardRemainingFunds = await this.gameSettingsService.getDiscardRemainingFunds();
        const totalDiscardFunds = discardRemainingFunds * remainingDiscards;
        await this.updateUserFunds(roomId, userId, totalDiscardFunds);

        this.logger.log(
          `[processHandPlayResult] 버리기 funds 지급: ` +
          `유저=${userId}, 남은버리기=${remainingDiscards}, 기본값=${discardRemainingFunds}, 지급funds=${totalDiscardFunds}`
        );
      }

      const { remainingDeck, remainingSevens } = this.getUserDeckInfo(roomId, userId);

      // 유저의 전체 핸드 카드 가져오기
      const fullHand = this.getUserHand(roomId, userId);
      const playedHand = allHandPlayCards.get(userId) || [];

      // 새로운 점수 계산 시스템 사용
      let finalScore = 0;
      let finalChips = 0;
      let finalMultiplier = 0;

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
    }

    return { userScores };
  }

  /**
   * 방의 유저 정보를 가져옵니다.
   */
  async getRoomUserInfos(roomId: string, userIds: string[]): Promise<Record<string, any>> {
    const userInfo: Record<string, any> = {};

    for (const uid of userIds) {
      const userChips = await this.getUserChips(roomId, uid);
      const isPlaying = this.isUserPlaying(roomId, uid);
      const ownedCards = this.getUserOwnedCards(roomId, uid);
      const paytableLevels = this.getUserPaytableLevels(roomId, uid);
      const paytableBaseChips = this.getUserPaytableBaseChips(roomId, uid);
      const paytableMultipliers = this.getUserPaytableMultipliers(roomId, uid);

      userInfo[uid] = {
        chips: userChips.chips,
        funds: userChips.funds,
        isPlaying,
        ownedCards: ownedCards.map(card => card.id),
        paytableLevels,
        paytableBaseChips,
        paytableMultipliers
      };
    }

    return userInfo;
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
    seedAmount: number;
    bettingAmount: number;
    chipsTable: number;     // 테이블의 총 칩
    userInfo: Record<string, any>;
  }> {
    const myCards = this.getUserHand(roomId, userId);
    const round = this.getRound(roomId);
    const chipType = this.getRoomState(roomId).chipSettings.chipType;
    const seedAmount = this.getBaseSeedAmount(roomId);
    const bettingAmount = this.getBaseBettingAmount(roomId);

    // 내 덱의 총 카드 수 계산 (초기 총 개수 표시용으로 핸드 카드 8장 포함)
    const gameState = this.gameStates.get(roomId);
    let totalDeckCards = 0;
    if (gameState && gameState.decks.has(userId)) {
      totalDeckCards = (gameState.decks.get(userId)?.length || 0) + 8; // 덱 카드 + 핸드 카드 8장
    }



    // playing 상태인 유저들만 필터링
    const playingUserIds = this.getPlayingUserIds(roomId, userIds);

    // 실제 테이블 칩 계산 (시드머니 납부 기록에서)
    const tableChips = this.getCurrentTableChips(roomId);
    const chipsTable = tableChips.chips;

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
          chipGain: -seedPayment.payment,
          chipNow: userChips.chips,
          funds: userChips.funds
        };
      } else {
        userInfo[uid] = {
          chipGain: -seedPayment.payment,
          chipNow: userChips.chips,
          funds: userChips.funds
        };
      }
    }

    return {
      round,
      totalDeckCards,
      seedAmount,
      bettingAmount,
      chipsTable,
      userInfo
    };
  }


  // === 유저별 게임 상태 관리 메서드들 ===

  /**
   * 유저의 게임 상태를 설정합니다.
   */
  setUserStatus(roomId: string, userId: string, status: 'waiting' | 'playing'): void {
    this.getRoomState(roomId).userStatusMap.set(userId, status);
    this.logger.log(`[setUserStatus] userId=${userId}, roomId=${roomId}, status=${status}`);
  }

  /**
   * 유저의 게임 상태를 가져옵니다.
   */
  getUserStatus(roomId: string, userId: string): 'waiting' | 'playing' | undefined {
    return this.getRoomState(roomId).userStatusMap.get(userId);
  }

  /**
   * 모든 유저의 게임 상태를 가져옵니다.
   */
  getAllUserStatuses(roomId: string): Map<string, 'waiting' | 'playing'> {
    return this.getRoomState(roomId).userStatusMap;
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
    const roomState = this.getRoomState(roomId);
    userIds.forEach(userId => {
      roomState.userStatusMap.set(userId, 'waiting');
    });
    this.logger.log(`[setAllUsersToWaiting] roomId=${roomId}, userIds=${userIds.join(',')}`);
  }

  /**
   * 방의 모든 유저 상태를 playing으로 설정합니다.
   */
  setAllUsersToPlaying(roomId: string, userIds: string[]): void {
    const roomState = this.getRoomState(roomId);
    userIds.forEach(userId => {
      roomState.userStatusMap.set(userId, 'playing');
    });
    this.logger.log(`[setAllUsersToPlaying] roomId=${roomId}, userIds=${userIds.join(',')}`);
  }

  /**
   * playing 상태인 유저 ID 목록을 가져옵니다.
   * @param roomId 방 ID
   * @param userIds (선택) 특정 유저 목록에서만 필터링하고 싶을 때 전달
   */
  getPlayingUserIds(roomId: string, userIds?: string[]): string[] {
    if (userIds) {
      return userIds.filter(uid => this.isUserPlaying(roomId, uid));
    }
    return Array.from(this.getRoomState(roomId).userStatusMap.entries())
      .filter(([_, status]) => status === 'playing')
      .map(([userId, _]) => userId);
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

  /**
 * 유저의 fold 요청을 처리합니다.
 * shop 단계에서만 가능하며, 유저를 playing에서 waiting 상태로 변경합니다.
 * 마지막 1명이 남으면 게임을 종료하고 새 게임을 시작합니다.
 */
  async handleFold(roomId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    isGameRestarting?: boolean;
    lastWinnerId?: string;
    chipsReward?: number;
    fundsReward?: number;
    finalChips?: number;
    finalFunds?: number;
  }> {
    try {
      const roomState = this.getRoomState(roomId);

      // 1. shop 단계인지 확인
      if (roomState.phase !== 'shop') {
        return {
          success: false,
          message: TranslationKeys.FoldShopPhaseOnly
        };
      }

      // 2. 유저가 playing 상태인지 확인
      if (!this.isUserPlaying(roomId, userId)) {
        return {
          success: false,
          message: TranslationKeys.FoldPlayingStatusOnly
        };
      }

      // 3. 유저 상태를 waiting으로 변경
      this.setUserStatus(roomId, userId, 'waiting');

      // 4. 게임 중인 유저 수 확인
      const playingUsers = this.getPlayingUserIds(roomId).map(userId => [userId, 'playing'] as [string, 'playing']);

      if (playingUsers.length === 1) {
        const lastPlayerId = playingUsers[0][0];

        // 5. 마지막 플레이어 보상 계산
        const rewards = await this.calculateLastPlayerRewards(roomId, lastPlayerId);

        // 6. 게임 종료 처리 및 새 게임 시작
        await this.handleGameEnd(roomId, lastPlayerId, rewards);

        // 마지막 승자의 최종 칩 정보 가져오기
        const lastPlayerChips = await this.getUserChips(roomId, lastPlayerId);

        return {
          success: true,
          message: TranslationKeys.LastPlayerWins,
          userId: userId,
          isGameRestarting: true,
          lastWinnerId: lastPlayerId,
          chipsReward: rewards.chips,
          fundsReward: rewards.funds,
          finalChips: lastPlayerChips.chips,
          finalFunds: lastPlayerChips.funds
        };
      }

      this.logger.log(
        `[handleFold] 유저 fold 완료: roomId=${roomId}, userId=${userId}, phase=${roomState.phase}`
      );

      return {
        success: true,
        message: TranslationKeys.FoldCompleted,
        userId: userId,
        isGameRestarting: false
      };
    } catch (error) {
      this.logger.error(
        `[handleFold] Error in handleFold: roomId=${roomId}, userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        success: false,
        message: TranslationKeys.FoldFailed
      };
    }
  }
}
