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

import { CardData, createDeck, shuffle, createSpecificHand } from './deck.util';
import { SpecialCardData } from './special-card-manager.service';
import { UserService } from '../user/user.service';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { SpecialCardManagerService } from './special-card-manager.service';
import { CardType, PokerHandResult, PokerHand, RandomValue } from './poker-types';
import { GameSettingsService } from '../common/services/game-settings.service';
import { TranslationKeys } from '../common/translation-keys.enum';
import { RoomDataDto } from './dto/room-list-response.dto';
import { RoundResult } from './socket-dto/hand-play-result-response.dto';
import { RoomPhase } from './room-phase.enum';
import { BettingState } from './betting-state.interface';
import { BettingType } from './betting-type.enum';
import { BettingResponseDto } from './socket-dto/betting-response.dto';
import { StartGameResponseDto } from './socket-dto/start-game-response.dto';
import { ChallengeService } from '../challenge/challenge.service';
import { ChallengeManagerService } from '../challenge/challenge-manager.service';

// RoomState 인터페이스 정의
interface RoomState {

  // 기존 gameState 필드들
  decks: Map<string, CardData[]>; // userId별 덱
  hands: Map<string, CardData[]>; // userId별 핸드
  round: number;
  phase: RoomPhase;

  // 칩 설정 (방별로 1개 타입만 사용)
  chipSettings: RoomChipSettings;
  timeLimit: number;

  // 통합된 필드들
  handPlayMap: Map<string, CardData[]>; // userId -> hand
  nextRoundReadySet: Set<string>; // userId Set
  gameReadySet: Set<string>; // userId Set
  shopCards: SpecialCardData[]; // 샵 카드 5장
  reRollCardsMap: Map<string, SpecialCardData[]>; // userId -> reRollCards
  userOwnedCardsMap: Map<string, SpecialCardData[]>; // userId -> ownedCards
  userDeckModifications: Map<string, CardData[]>; // userId -> modifiedDeck
  userTarotCardsMap: Map<string, SpecialCardData[]>; // userId -> tarotCards
  userFirstDeckCardsMap: Map<string, CardData[]>; // userId -> firstDeckCards
  userChipsMap: Map<string, UserChips>; // userId -> chips

  usedJokerCardIds: Set<string>; // 조커카드 id Set
  discardCountMap: Map<string, number>; // userId -> count
  userStatusMap: Map<string, 'waiting' | 'playing'>; // userId -> status
  userSeedMoneyPayments: Map<string, SeedPayment>; // userId -> payment
  roundMaxPrizes: number[]; // [1라운드, 2라운드, 3라운드, 4라운드, 5라운드]
  userTotalDeckCardsMap: Map<string, number>; // userId -> 초기 덱 총 카드 개수
  userNicknameMap: Map<string, string>; // userId -> nickname
  bettingState: BettingState; // 베팅 상태
  testJokerIds: string[]; // 테스트 조커 ID 5개
  silverTotalScore: number; // SILVER 방용 총 스코어 (라운드별 점수 누적)
  roomOwnerId: string | null; // 방장 아이디
  forcedHand: PokerHand | null; // 강제로 나눠줄 족보


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
  // funds: number;    // 실제 납부한 자금
}

// 칩 타입 열거형
export enum ChipType {
  SILVER = 0,
  GOLD = 1
}

// 방별 칩 설정
interface RoomChipSettings {
  chipType: ChipType;  // 방에서 사용할 칩 타입 (1개만)
  seedAmount: number;  // 시드 머니
  // bettingAmount: number;  // 베팅 머니
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  // === [유틸리티 함수] ===

  private resetRoomState(roomId: string) {
    this.gameStates.delete(roomId);
  }

  // RoomState 유틸리티 메서드들
  public getRoomState(roomId: string): RoomState {
    if (!this.gameStates.has(roomId)) {
      this.gameStates.set(roomId, this.createInitialRoomState());
    }
    return this.gameStates.get(roomId)!;
  }

  private createInitialRoomState(): RoomState {
    return {
      decks: new Map(),
      hands: new Map(),
      round: 0,
      phase: RoomPhase.WAITING,
      chipSettings: {
        chipType: ChipType.SILVER,
        seedAmount: 0
      },
      // currentBettingAmount: 0,
      timeLimit: 0,
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
      // bettingSet: new Set(),
      usedJokerCardIds: new Set(),
      discardCountMap: new Map(),
      userStatusMap: new Map(),
      userSeedMoneyPayments: new Map(),
      roundMaxPrizes: [1, 2, 3, 4, 5],
      userTotalDeckCardsMap: new Map(),
      userNicknameMap: new Map(),
      testJokerIds: ['', '', '', '', ''], // 테스트 조커 ID 초기화
      silverTotalScore: 0, // SILVER 방용 총 스코어 초기화
      roomOwnerId: null, // 방장 아이디 초기화
      forcedHand: null, // 강제 족보 초기화
      bettingState: {
        currentUser: null,
        tableChips: 0,
        order: [],
        completed: new Set(),
        bets: new Map(),
        raiseCounts: new Map(),
        checkUsed: false,
        remainingTableMoney: 0,
        userCallChips: new Map(),
        initialTableChips: 0
      },

      // 메서드 구현
      resetGameStateForNewGame(): void {
        // 게임 진행 관련 상태만 초기화 (방 설정값 유지)
        this.round = 0;
        this.phase = RoomPhase.WAITING;
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
        this.usedJokerCardIds.clear();
        this.discardCountMap.clear();
        this.userStatusMap.clear();
        this.userSeedMoneyPayments.clear();
        this.roundMaxPrizes = [1, 2, 3, 4, 5];
        this.userTotalDeckCardsMap.clear();
        this.userNicknameMap.clear();
        // this.testJokerIds = ['', '', '', '', '']; // 테스트 조커 ID 초기화 - 게임 리셋 시에는 유지
        this.silverTotalScore = 0; // SILVER 방용 총 스코어 초기화
        // this.forcedHand = null; // 강제 족보 초기화 - 게임 리셋 시에는 유지
        // this.roomOwnerId = null; // 방장 아이디 초기화
        this.bettingState = {
          currentUser: null,
          tableChips: 0,
          callChips: 0,
          order: [],
          completed: new Set(),
          bets: new Map(),
          raiseCounts: new Map(),
          checkUsed: false,
          remainingTableMoney: 0,
          userCallChips: new Map(),
          initialTableChips: 0
        };
      }
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly paytableService: PaytableService,
    private readonly handEvaluatorService: HandEvaluatorService,
    private readonly specialCardManagerService: SpecialCardManagerService,
    private readonly gameSettingsService: GameSettingsService,
    private readonly challengeService: ChallengeService,
    private readonly challengeManagerService: ChallengeManagerService,
  ) { }

  // 통합된 RoomState 관리
  private gameStates: Map<string, RoomState> = new Map();

  async findAll() {
    try {

      const rooms = await this.prisma.room.findMany();

      return rooms;
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching rooms from database',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /* 주석 제거 하지 말 것
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
  */

  async createRoom(
    name: string,
    maxPlayers: number,
    chipType: ChipType,
    seedAmount: number,
    timeLimit: number
  ) {
    try {
      this.logger.debug(`Creating Redis room: ${name}`);
      const roomId = uuidv4();
      const roomKey = `room:${roomId}`;

      if (chipType === ChipType.SILVER) {
        maxPlayers = 1;
        seedAmount = 100;
      }
      let finalChipType = chipType;
      let finalSeedAmount = seedAmount;

      /* 주석 제거 하지 말 것
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
      */

      const roomData = {
        roomId,
        name,
        maxPlayers,
        players: 0, // 방 생성 시에는 아무도 없음
        status: 'waiting',
        createdAt: Date.now(),
        chipType: finalChipType,
        seedAmount: finalSeedAmount,
        timeLimit: timeLimit
      };
      const client = this.redisService.getClient();
      await client.hset(roomKey, roomData);
      // 칩 타입에 따라 분리된 방리스트에 추가
      if (finalChipType === ChipType.GOLD) {
        await client.sadd('rooms:gold', roomId);
      } else if (finalChipType === ChipType.SILVER) {
        await client.sadd('rooms:silver', roomId);
      }
      this.logger.debug(`Room created successfully: ${roomId}`);

      const roomState = this.createInitialRoomState();

      roomState.chipSettings.chipType = finalChipType;
      roomState.chipSettings.seedAmount = finalSeedAmount;
      roomState.timeLimit = timeLimit;


      this.gameStates.set(roomId, roomState);

      // 라운드별 최대 상금 초기화
      await this.initializeRoundMaxPrizes(roomId, finalSeedAmount);

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

  async joinRoom(roomId: string, userId: string): Promise<{ success: boolean; message?: string; chipType?: ChipType; timeLimit?: number }> {
    try {
      this.logger.debug(`User ${userId} attempting to join room ${roomId}`);

      const client = this.redisService.getClient();
      const roomKey = `room:${roomId}`;
      const usersKey = `room:${roomId}:users`;
      const room = await client.hgetall(roomKey);
      if (!room || !room.roomId) throw new RoomNotFoundException(roomId);

      // 중복 입장 체크
      const isUserInRoom = await client.sismember(usersKey, userId);
      if (isUserInRoom) throw new UserAlreadyInRoomException(userId, roomId);

      const chipType = (parseInt(room.chipType) || ChipType.SILVER) as ChipType;
      const currentPlayers = parseInt(room.players || '1', 10);
      const timeLimit = parseInt(room.timeLimit || '0', 10);

      // Silver 방과 Gold 방에 따른 다른 로직 적용
      if (chipType === ChipType.SILVER) {
        // Silver 방: 1인 전용 연습방
        // 방 인원수가 0명일 때만 입장 성공
        if (currentPlayers !== 0) {
          return {
            success: false,
            message: "Silver room is for single player practice only"
          };
        }
      } else {
        // Gold 방: 기존 로직 적용
        const maxPlayers = parseInt(room.maxPlayers || '4', 10);
        if (currentPlayers >= maxPlayers) throw new RoomFullException(roomId);

        // 🆕 입장 제한 머니 검증
        const seedAmount = parseInt(room.seedAmount || '0', 10);
        if (seedAmount > 0) {
          const entryRequirement = this.calculateEntryRequirement(seedAmount);

          // 사용자 칩 정보 조회
          const user = await this.userService.findByUserId(userId);
          if (user) {
            const userChips = chipType === ChipType.GOLD ? (user.goldChip || 0) : (user.silverChip || 0);

            if (userChips < entryRequirement) {
              return {
                success: false,
                message: `Insufficient chips. Required: ${entryRequirement}, Available: ${userChips}`
              };
            }
          }
        }
      }

      const newPlayers = currentPlayers + 1;

      await client.hset(roomKey, 'players', newPlayers);
      await client.sadd(usersKey, userId);
      await this.initializeUserChips(roomId, userId);

      // 유저 상태를 waiting으로 초기화
      this.setUserStatus(roomId, userId, 'waiting');

      // 유저 닉네임 저장
      await this.setUserNickname(roomId, userId);

      // 최초 방 입장 시 방장으로 설정
      const roomState = this.getRoomState(roomId);
      if (roomState.roomOwnerId === null) {
        this.setRoomOwner(roomId, userId);
      }

      return { success: true, chipType: chipType, timeLimit: timeLimit };
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

  // 닉네임 관리 메서드들
  private async setUserNickname(roomId: string, userId: string): Promise<void> {
    try {
      const roomState = this.getRoomState(roomId);
      const user = await this.userService.findByUserId(userId);
      if (user && user.nickname) {
        roomState.userNicknameMap.set(userId, user.nickname);
        // this.logger.debug(`[setUserNickname] userId=${userId}, nickname=${user.nickname}`);
      }
    } catch (error) {
      this.logger.error(`[setUserNickname] Error setting nickname for userId=${userId}`, error);
    }
  }

  public getUserNickname(roomId: string, userId: string): string {
    const roomState = this.getRoomState(roomId);
    return roomState.userNicknameMap.get(userId) || userId; // 닉네임이 없으면 userId 반환
  }

  private removeUserNickname(roomId: string, userId: string): void {
    const roomState = this.getRoomState(roomId);
    roomState.userNicknameMap.delete(userId);
    // this.logger.debug(`[removeUserNickname] userId=${userId} removed from room=${roomId}`);
  }

  async findAllRoomsInRedis(): Promise<RoomDataDto[]> {
    try {
      const client = this.redisService.getClient();
      // Gold 방만 조회
      const roomIds: string[] = await client.smembers('rooms:gold');

      const rooms = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            const room = await client.hgetall(`room:${roomId}`);
            if (room && room.roomId) {
              // 시드 칩 정보 추가
              const seedChip = this.getSeedChip(roomId);

              // 명확한 타입으로 변환하여 players 필드 확인
              const roomData: RoomDataDto = {
                roomId: room.roomId,
                name: room.name,
                maxPlayers: parseInt(room.maxPlayers || '4', 10),
                players: parseInt(room.players || '0', 10), // Redis에 저장된 players 값 사용
                status: room.status || 'waiting',
                createdAt: parseInt(room.createdAt || '0', 10),
                seedChip: seedChip,
                chipType: parseInt(room.chipType) || ChipType.GOLD,
              };

              // 디버깅: 실제 유저 수와 Redis에 저장된 값 비교
              const usersKey = `room:${roomId}:users`;
              const actualUserCount = await client.scard(usersKey);

              // 만약 실제 유저 수와 저장된 값이 다르면 경고
              if (roomData.players !== actualUserCount) {
                this.logger.warn(`[findAllRoomsInRedis] MISMATCH! Room ${roomId}: stored_players=${roomData.players}, actual_users=${actualUserCount}`);
              }
              return roomData;
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

      const validRooms = rooms.filter((room) => room) as RoomDataDto[];
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

      // 유저 닉네임 제거
      this.removeUserNickname(roomId, userId);

      // 방장이 나간 경우 새로운 방장 선택
      if (roomState.roomOwnerId === userId) {
        this.selectNewRoomOwner(roomId);
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
      const client = this.redisService.getClient();
      await client.del(`room:${roomId}`);
      await client.del(`room:${roomId}:users`);
      // 방 삭제 시 모든 방리스트에서 제거
      await client.srem('rooms:gold', roomId);
      await client.srem('rooms:silver', roomId);

      // 메모리 상태도 초기화
      this.resetRoomState(roomId);

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

  /**
   * 유저가 플레이에 필요한 칩을 가지고 있는지 확인합니다.
   */
  private async hasEnoughChipsForPlay(roomId: string, userId: string): Promise<boolean> {
    const roomState = this.getRoomState(roomId);
    const chipType = roomState.chipSettings.chipType;
    if (chipType === ChipType.SILVER) {
      return true;
    }

    const seedChip = this.getSeedChip(roomId);
    const playRequirement = this.calculatePlayRequirement(seedChip);
    const userChips = await this.getUserChips(roomId, userId);

    return playRequirement <= userChips.chips;
  }

  async setReady(roomId: string, userId: string): Promise<StartGameResponseDto> {

    if (!(await this.hasEnoughChipsForPlay(roomId, userId))) {
      return new StartGameResponseDto({
        success: false,
        message: 'Not enough gold chips',
        userId: userId
      });
    }

    const roomState = this.getRoomState(roomId);
    roomState.gameReadySet.add(userId);

    return new StartGameResponseDto({
      success: true,
      userId: userId
    });
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

  async canStart(roomId: string): Promise<boolean> {
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

      const roomState = this.getRoomState(roomId);
      const usersWithEnoughChips: string[] = [];
      for (const userId of userIds) {
        if (await this.hasEnoughChipsForPlay(roomId, userId)) {
          usersWithEnoughChips.push(userId);
        }
      }

      if (usersWithEnoughChips.length === 0) {
        this.logger.warn(`[canStart] roomId=${roomId}에 칩이 있는 유저가 없음`);
        return false;
      }

      // 준비된 유저들 가져오기
      const readyUsers = Array.from(roomState.gameReadySet);

      // 칩이 있는 유저들이 모두 준비되었는지 확인
      const allReady = usersWithEnoughChips.every((userId) => readyUsers.includes(userId));

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
    roomState.userTarotCardsMap.clear();
    roomState.userFirstDeckCardsMap.clear();
    roomState.round = roomState.round + 1;

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
    let room: Set<string> | undefined;
    if (adapter && adapter.rooms) {
      room = adapter.rooms.get(roomId);
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
        if (uid) userIds.push(uid);
      }
    } else {
      throw new Error(
        'socketId <-> userId 매핑이 존재하지 않습니다. 쌍으로 관리되어야 합니다.',
      );
    }

    // 라운드에 따라 참여할 유저 결정
    const round = roomState.round;

    let participatingUserIds: string[];

    if (round === 1) {
      // 1라운드: 칩이 충분한 유저만 참여
      const usersWithEnoughChips: string[] = [];
      for (const userId of userIds) {
        if (await this.hasEnoughChipsForPlay(roomId, userId)) {
          usersWithEnoughChips.push(userId);
        }
      }
      participatingUserIds = usersWithEnoughChips;

      // 1라운드에서 칩이 있는 유저가 없으면 게임 시작 중단
      if (participatingUserIds.length === 0) {
        this.logger.warn(`[startGame] 1라운드 - 칩이 있는 유저가 없어 게임 시작 중단: roomId=${roomId}`);
        return;
      }
    } else {
      // 2라운드 이상: playing 상태인 유저만 참여
      participatingUserIds = this.getPlayingUserIds(roomId, userIds);
    }

    // userId별로 덱 셔플 (참여하는 유저만)
    const decks = new Map<string, CardData[]>();
    const hands = new Map<string, CardData[]>();
    for (const userId of participatingUserIds) {
      let userDeck: CardData[];
      let userHand: CardData[];

      // 강제 족보가 설정되어 있는지 확인
      if (roomState.forcedHand) {
        // 강제 족보로 핸드 생성
        userHand = createSpecificHand(roomState.forcedHand);
        // 나머지 카드들로 덱 생성
        const remainingCards = createDeck().filter(card =>
          !userHand.some(handCard =>
            handCard.suit === card.suit && handCard.rank === card.rank
          )
        );
        userDeck = shuffle(remainingCards);
      } else {
        // 수정된 덱이 있는지 확인
        const userDeckModifications = roomState.userDeckModifications.get(userId);
        if (userDeckModifications) {
          // 수정된 덱이 있으면 그것을 사용
          userDeck = shuffle([...userDeckModifications]);
          roomState.userDeckModifications.delete(userId); // 사용 후 삭제
        } else {
          // 일반적인 새 덱 생성
          userDeck = shuffle(createDeck());
        }
        userHand = userDeck.splice(0, 8);
      }

      decks.set(userId, userDeck);
      hands.set(userId, [...userHand]); // 복사본 저장
    }
    roomState.decks = decks;
    roomState.hands = hands;
    roomState.round = round;
    roomState.phase = RoomPhase.PLAYING;

    // 라운드에 따라 유저 상태 변경
    if (round === 1) {
      // 1라운드: 모든 유저를 playing으로 변경
      this.setAllUsersToPlaying(roomId, userIds);
      roomState.usedJokerCardIds.clear();
      this.paytableService.resetAllUserData();
    }

    // 샵 카드 5장 생성 (조커 3장, 행성 1장, 타로 1장) - 이미 등장한 조커카드 제외
    const shopCards = this.specialCardManagerService.getRandomShopCards(5, roomState.round, roomState.usedJokerCardIds, roomState.testJokerIds);
    roomState.shopCards = [...shopCards]; // 복사본 저장

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    shopCards.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        roomState.usedJokerCardIds.add(card.id);
      }
    });

    // 새로운 라운드 시작 시 다시뽑기 카드 초기화
    roomState.reRollCardsMap.clear();
    // 새로운 라운드 시작 시 버리기 횟수 초기화
    roomState.discardCountMap.clear();

    // 1라운드일 때만 시드머니 납부 처리 (GOLD 방만)
    if (round === 1) {
      const chipType = roomState.chipSettings.chipType;
      const baseSeedAmount = this.getSeedChip(roomId);

      // 유저별 시드머니 납부 처리
      for (const uid of userIds) {
        const chips = await this.getUserChips(roomId, uid);

        if (chipType === ChipType.GOLD) {
          // 실제 납부 가능한 금액 계산 (가진 돈이 부족하면 가진 돈만큼만)
          const actualPayment = Math.min(baseSeedAmount, chips.chips);
          roomState.userSeedMoneyPayments.set(uid, {
            payment: actualPayment
          });
          await this.updateUserChips(roomId, uid, -actualPayment);
        }

        await this.updateUserFunds(roomId, uid, -chips.funds);

        this.logger.log(
          `[startGame] 1라운드 ${uid} 시드머니 납부: ` +
          `요구(seedAmount=${baseSeedAmount}), ` +
          `자금=${chips.funds}`
        );
      }

    } else {
      // 주석 삭제 하지 말것..나중에 복구 할수도 있음
      // 2라운드 이상: 베팅칩만큼 실제 칩을 감소시키고 납부기록에 추가
      // const bettingAmount = this.getCurrentBettingAmount(roomId);

      // 베팅칩이 있으면 각 유저의 칩을 감소시키고 납부기록에 추가
      // if (bettingAmount > 0) {
      //   for (const uid of userIds) {
      //     const chips = await this.getUserChips(roomId, uid);

      //     // 실제 납부 가능한 금액 계산 (가진 돈이 부족하면 가진 돈만큼만)
      //     const actualPayment = Math.min(bettingAmount, chips.chips);

      //     const existingPayment = roomState.userSeedMoneyPayments.get(uid) || { payment: 0, funds: 0 };

      //     // 기존 납부 기록에 실제 납부한 베팅칩 추가
      //     roomState.userSeedMoneyPayments.set(uid, {
      //       payment: existingPayment.payment + actualPayment,
      //       funds: existingPayment.funds
      //     });

      //     // 실제 칩 감소
      //     await this.updateUserChips(roomId, uid, -actualPayment);

      //     this.logger.log(
      //       `[startGame] ${round}라운드 ${uid} 베팅칩 시드머니 납부: ` +
      //       `요구베팅(bettingAmount=${bettingAmount}), ` +
      //       `실제납부(payment=${actualPayment}), ` +
      //       `기존납부(payment=${existingPayment.payment}), ` +
      //       `총납부(payment=${existingPayment.payment + actualPayment})`
      //     );
      //   }
      // } else {
      //   this.logger.log(`[startGame] ${round}라운드 - 베팅칩 없음, 시드머니 납부 없음`);
      // }
    }
  }

  getUserHand(roomId: string, userId: string): CardData[] {
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
    return result;
  }

  // async removeUserFromRoom(roomId: string, userId: string) {
  //   // 방에서 유저 제거 (게임 로직만 처리)
  //   const roomState = this.getRoomState(roomId);

  //   // 유저 상태를 waiting으로 변경
  //   this.setUserStatus(roomId, userId, 'waiting');

  //   // 유저를 playing에서 제거
  //   roomState.userStatusMap.delete(userId);

  //   // 유저 닉네임 제거
  //   this.removeUserNickname(roomId, userId);

  //   this.logger.log(
  //     `[removeUserFromRoom] 유저 제거 완료: roomId=${roomId}, userId=${userId}`
  //   );
  // }

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
    cards: CardData[],
  ): { newHand: CardData[]; discarded: CardData[]; remainingDiscards: number } {
    // 버리기 횟수 증가
    const newCount = this.incrementUserDiscardCount(roomId, userId);
    const remainingDiscards = this.getRemainingDiscards(roomId, userId);

    const roomState = this.getRoomState(roomId);
    const hand = roomState.hands.get(userId);
    if (!hand) throw new Error('User hand not found');
    const deck = roomState.decks.get(userId);
    if (!deck) throw new Error('User deck not found');
    const discarded: CardData[] = [];
    for (const cardInfo of cards) {
      const idx = hand.findIndex(
        (c) => c.id === cardInfo.id,
      );
      if (idx !== -1) {
        discarded.push(hand.splice(idx, 1)[0]);
      }
    }
    const newCards: CardData[] = deck.splice(0, discarded.length);
    hand.push(...newCards);
    roomState.hands.set(userId, [...hand]); // 복사본 저장
    roomState.decks.set(userId, [...deck]); // 복사본 저장


    return { newHand: [...hand], discarded: [...discarded], remainingDiscards };
  }

  handPlayReady(roomId: string, userId: string, playCards: CardData[]): void {
    this.getRoomState(roomId).handPlayMap.set(userId, playCards);
  }

  canRevealHandPlay(roomId: string, userIds: string[]): boolean {
    const roomState = this.getRoomState(roomId);
    const handMap = roomState.handPlayMap;

    // playing 상태인 유저들만 필터링
    const playingUsers = this.getPlayingUserIds(roomId, userIds);

    // playing 상태인 유저가 없으면 false
    if (playingUsers.length === 0) {
      return false;
    }

    // playing 상태인 유저들이 모두 handPlay를 완료했는지 확인
    const allReady = playingUsers.every((uid) => handMap.has(uid));

    return allReady;
  }

  getAllHandPlayCards(roomId: string): { userId: string; playCards: CardData[] }[] {
    const roomState = this.getRoomState(roomId);
    const result: { userId: string; playCards: CardData[] }[] = [];
    for (const [userId, playCards] of roomState.handPlayMap.entries()) {
      result.push({ userId, playCards: [...playCards] });
    }
    return result;
  }

  setNextRoundReady(roomId: string, userId: string): void {
    this.getRoomState(roomId).nextRoundReadySet.add(userId);
  }

  canStartNextRound(roomId: string): boolean {
    const roomState = this.getRoomState(roomId);
    const readySet = roomState.nextRoundReadySet;
    const userIds = this.getRoomUserIds(roomId);

    // playing 상태인 유저들만 필터링
    const playingUsers = this.getPlayingUserIds(roomId, userIds);

    // playing 상태인 유저가 없으면 false
    if (playingUsers.length === 0) {
      return false;
    }

    // playing 상태인 유저들이 모두 nextRound 준비를 완료했는지 확인
    const allReady = playingUsers.every((uid) => readySet.has(uid));

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
    const reRollCardsRaw: SpecialCardData[] = this.specialCardManagerService.getRandomShopCards(5, roomState.round, usedJokerSet, roomState.testJokerIds);

    // 새로 뽑힌 조커카드 id를 usedJokerSet에 추가
    reRollCardsRaw.forEach(card => {
      if (this.specialCardManagerService.isJokerCard(card.id)) {
        usedJokerSet.add(card.id);
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
    firstDeckCards?: CardData[];
    planetCardIds?: string[];
  }> {
    try {

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

      let firstDeckCards: CardData[] | undefined;
      let planetCardIds: string[] | undefined;

      // 7. 카드 구매 처리

      if (this.specialCardManagerService.isJokerCard(cardId)) {
        // 조커 카드 처리
        const userCards = roomState.userOwnedCardsMap.get(userId) ?? [];
        const newCard = this.specialCardManagerService.createCardById(cardId);
        if (newCard) {
          userCards.push(newCard);
          roomState.userOwnedCardsMap.set(userId, userCards);
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

          this.logger.log(`[buyCard] userId=${userId}의 행성 카드 ${cardId} 효과를 적용합니다.`);

          for (const planetCardId of planetCardIds) {
            const planetCard = this.specialCardManagerService.getCardById(planetCardId);
            if (planetCard && planetCard.pokerHand && planetCard.enhanceChips !== undefined && planetCard.enhanceMul !== undefined) {
              this.paytableService.enhanceLevel(userId, planetCard.pokerHand);
              this.paytableService.enhanceChips(userId, planetCard.pokerHand, planetCard.enhanceChips);
              this.paytableService.enhanceMultiplier(userId, planetCard.pokerHand, planetCard.enhanceMul);

              this.logger.log(`[buyCard] 행성 카드 ${planetCardId} 효과 적용 완료: ${planetCard.pokerHand} - 칩스 +${planetCard.enhanceChips}, 배수 +${planetCard.enhanceMul}`);
            }
          }
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
          let modifiedDeck: CardData[];
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
        cardDescription: shopCard.descriptionKo,
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
  getSeedChip(roomId: string): number {
    return this.getRoomState(roomId).chipSettings.seedAmount;
  }

  // getBaseBettingAmount(roomId: string): number {
  //   return this.getRoomState(roomId).chipSettings.bettingAmount;
  // }

  // getCurrentBettingAmount(roomId: string): number {
  //   return this.getRoomState(roomId).currentBettingAmount;
  // }

  // // === 실시간 seed 칩 (변동값) ===
  // getBettingAmount(roomId: string): number {
  //   return this.getRoomState(roomId).currentBettingAmount;
  // }

  // // === 실시간 seed 칩 업데이트 ===
  // updateBettingAmount(roomId: string, amount: number): void {
  //   const roomState = this.getRoomState(roomId);
  //   const prevValue = roomState.currentBettingAmount;
  //   roomState.currentBettingAmount = Math.max(0, roomState.currentBettingAmount + amount);
  //   this.logger.log(
  //     `[updateBettingAmount] roomId=${roomId}, currentBettingAmount: ${prevValue} -> ${roomState.currentBettingAmount} (${amount >= 0 ? '+' : ''}${amount})`
  //   );
  // }

  // // === 라운드 시작 시 실시간 seed 칩을 기본값으로 리셋 ===
  // resetBettingChips(roomId: string): void {
  //   const roomState = this.getRoomState(roomId);
  //   roomState.currentBettingAmount = 0;
  //   this.logger.log(
  //     `[resetBettingChips] roomId=${roomId}, currentBettingAmount: 0`
  //   );
  // }

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

      // 3. 카드 제거
      userCards.splice(cardIndex, 1);
      roomState.userOwnedCardsMap.set(userId, userCards);

      // 4. funds 증가 (판매 가격만큼)
      await this.updateUserFunds(roomId, userId, cardPrice);

      // 5. 업데이트된 funds 가져오기
      const updatedUserChips = await this.getUserChips(roomId, userId);


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
  // async handleRoundEnd(roomId: string) {
  //   const round = this.getRound(roomId) + 1;

  //   if (round > 5) {
  //     // 5라운드 종료 후 게임 종료 처리
  //     await this.handleGameEnd(roomId);
  //     this.logger.log(`[handleRoundEnd] 5라운드 완료 - 게임 상태 초기화 완료: roomId=${roomId}`);
  //   } else {
  //     // 다음 라운드로 진행
  //     const prevState = this.gameStates.get(roomId);
  //     if (prevState) {
  //       this.gameStates.set(roomId, {
  //         ...prevState,
  //         round,
  //       });
  //     }
  //   }
  // }

  /**
   * 베팅을 처리합니다.
   */
  // async handleBetting(roomId: string, userId: string): Promise<{
  //   success: boolean;
  //   message: string;
  //   currentSeedAmount?: number;
  //   currentBettingAmount?: number;
  // }> {
  //   try {
  //     this.logger.log(
  //       `[handleBetting] 베팅 시도: roomId=${roomId}, userId=${userId}`,
  //     );

  //     // 1. 이미 베팅했는지 확인
  //     const roomState = this.getRoomState(roomId);
  //     if (roomState.bettingSet.has(userId)) {
  //       this.logger.warn(
  //         `[handleBetting] 이미 베팅한 유저: roomId=${roomId}, userId=${userId}`,
  //       );
  //       return {
  //         success: false,
  //         message: TranslationKeys.AlreadyBetting
  //       };
  //     }

  //     // 2. 기본 seed 칩 값 가져오기
  //     const baseBettingAmount = this.getBaseBettingAmount(roomId);

  //     // 3. 현재 베팅 칩 증가
  //     if (baseBettingAmount > 0) {
  //       this.updateBettingAmount(roomId, baseBettingAmount);
  //     }

  //     // 4. 베팅 상태 기록
  //     roomState.bettingSet.add(userId);

  //     // 5. 업데이트된 현재 베팅 칩 값 가져오기
  //     const bettingAmount = this.getBettingAmount(roomId);

  //     this.logger.log(
  //       `[handleBetting] 베팅 완료: roomId=${roomId}, userId=${userId}, ` +
  //       `bettingAmount=${bettingAmount}`,
  //     );

  //     return {
  //       success: true,
  //       message: TranslationKeys.BettingCompleted,
  //       currentBettingAmount: bettingAmount,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `[handleBetting] Error in handleBetting: roomId=${roomId}, userId=${userId}`,
  //       error instanceof Error ? error.stack : String(error),
  //     );
  //     return { success: false, message: TranslationKeys.BettingFailed };
  //   }
  // }

  /**
   * 방의 현재 phase를 반환합니다.
   */
  getRoomPhase(roomId: string): RoomPhase | undefined {
    return this.getRoomState(roomId).phase;
  }

  /**
   * 방의 phase를 변경합니다.
   */
  setRoomPhase(roomId: string, phase: RoomPhase): void {
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
  getUserFirstDeckCards(roomId: string, userId: string): CardData[] {
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
   * 유저의 덱 정보를 가져옵니다.
   */
  getUserDeckInfo(roomId: string, userId: string): { remainingDeck: CardData[]; remainingSevens: number; totalDeck: number } {
    const roomState = this.getRoomState(roomId);
    const deck = roomState.decks.get(userId);
    if (!deck) {
      this.logger.warn(`[getUserDeckInfo] userId=${userId}의 덱이 없습니다.`);
      return { remainingDeck: [], remainingSevens: 0, totalDeck: 0 };
    }

    const remainingDeck = [...deck]; // 덱의 모든 카드 정보를 복사
    const remainingSevens = deck.filter(card => card.rank === 7).length;
    const totalDeck = this.getUserTotalDeckCards(roomId, userId);

    return { remainingDeck, remainingSevens, totalDeck };
  }

  /**
   * 유저의 초기 덱 총 카드 개수를 가져옵니다.
   */
  getUserTotalDeckCards(roomId: string, userId: string): number {
    const roomState = this.getRoomState(roomId);
    return roomState.userTotalDeckCardsMap.get(userId) || 0;
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
  }

  // 방의 모든 유저 버리기 횟수 가져오기
  getDiscardCountMap(roomId: string): Map<string, number> {
    return this.getRoomState(roomId).discardCountMap;
  }

  // 시드머니 납부 관련 헬퍼 메서드들
  getUserSeedMoneyPayment(roomId: string, userId: string): { payment: number } {
    const roomState = this.getRoomState(roomId);
    return roomState.userSeedMoneyPayments.get(userId) || { payment: 0 };
  }

  getAllUserSeedMoneyPayments(roomId: string): Map<string, { payment: number }> {
    return this.getRoomState(roomId).userSeedMoneyPayments;
  }

  resetSeedMoneyPayments(roomId: string): void {
    this.getRoomState(roomId).userSeedMoneyPayments.clear();
  }

  /**
   * 시드머니 납부 기록에서 분배로 빠져나간 금액을 감소시킵니다.
   */
  updateSeedMoneyPayment(roomId: string, userId: string, chipsReduction: number): void {
    const roomState = this.getRoomState(roomId);
    const userPayment = roomState.userSeedMoneyPayments.get(userId);
    if (!userPayment) {
      this.logger.warn(`[updateSeedMoneyPayment] userId=${userId}에 대한 시드머니 납부 기록이 없습니다.`);
      return;
    }

    // 분배로 빠져나간 금액만큼 감소
    userPayment.payment = Math.max(0, userPayment.payment - chipsReduction);
    // userPayment.funds = Math.max(0, userPayment.funds - fundsReduction);

    this.logger.log(
      `[updateSeedMoneyPayment] ${userId} 시드머니 납부 기록 업데이트: ` +
      `감소량(chips=${chipsReduction}), ` +
      `남은금액(chips=${userPayment.payment}`
    );
  }

  /**
   * 현재 테이블의 총 칩을 계산합니다.
   */
  getTableChips(roomId: string): number {
    const roomState = this.getRoomState(roomId);
    let totalChips = 0;

    for (const payment of roomState.userSeedMoneyPayments.values()) {
      totalChips += payment.payment;
    }

    return totalChips;
  }

  /**
   * 라운드별 최대 상금을 설정합니다.
   */
  setRoundMaxPrizes(roomId: string, maxPrizes: number[]): void {
    if (maxPrizes.length !== 5) {
      throw new Error('라운드별 최대 상금은 5개(1~5라운드)여야 합니다.');
    }
    this.getRoomState(roomId).roundMaxPrizes = [...maxPrizes];
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

    const totalMaxPrize = baseMaxPrize;

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
  public async handleGameEnd(
    roomId: string
  ): Promise<void> {
    const roomState = this.getRoomState(roomId);
    const userIds = await this.getUserIdsInRoom(roomId);

    // 1. 모든 사용자의 칩 정보를 DB에 저장
    for (const userId of userIds) {
      await this.saveUserChipsOnLeave(roomId, userId);
    }

    // 2. SILVER 방에서 5라운드 완료 시 piggybank 챌린지 업데이트
    if (roomState.chipSettings.chipType === ChipType.SILVER && roomState.round === 5) {
      await this.updatePiggybankChallenges(userIds);
    }

    // 3. 게임 상태 초기화
    roomState.resetGameStateForNewGame();
    this.setAllUsersToWaiting(roomId, userIds);
    this.setRoomPhase(roomId, RoomPhase.WAITING);
  }

  /**
   * SILVER 방에서 5라운드 완료 시 piggybank 챌린지들을 업데이트합니다.
   */
  private async updatePiggybankChallenges(userIds: string[]): Promise<void> {
    try {
      const piggybankChallengeIds = ['PiggyBankPlay0', 'PiggyBankPlay1', 'PiggyBankPlay2', 'PiggyBankPlay3'];

      for (const userId of userIds) {
        for (const challengeId of piggybankChallengeIds) {
          // 현재 진행도와 targetCount 확인
          const userProgress = await this.challengeService.getUserChallengeProgress(userId);
          const progressData = userProgress.get(challengeId);
          const challenge = this.challengeManagerService.getChallenge(challengeId);

          if (challenge && progressData) {
            // targetCount를 넘지 않도록 제한
            if (progressData.currentCount < challenge.targetCount) {
              await this.challengeService.updateChallengeProgressOnly(userId, challengeId, 1);
            }
          } else if (challenge) {
            // 진행도가 없는 경우 새로 생성 (currentCount = 1)
            await this.challengeService.updateChallengeProgressOnly(userId, challengeId, 1);
          }
        }
      }

      this.logger.log(`[RoomService] SILVER 방 5라운드 완료 - piggybank 챌린지 업데이트: userIds=${userIds.length}명, challenges=${piggybankChallengeIds.length}개`);
    } catch (error) {
      this.logger.error(`[RoomService] piggybank 챌린지 업데이트 실패`, error);
    }
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
  ): Promise<{ chipsGain: number; funds: number; originalChipsGain: number }> {
    const roomState = this.getRoomState(roomId);

    // 시드머니 합산
    let chipsGain = 0;
    let totalFunds = 0;
    roomState.userSeedMoneyPayments.forEach((payment) => {
      chipsGain += payment.payment;
    });

    const originalChipsGain = chipsGain;
    const dealerFee = Math.floor(chipsGain * 0.03);
    chipsGain -= dealerFee;

    // 마지막 남은 유저에게 시드머니 지급
    await this.updateUserChips(roomId, lastPlayerId, chipsGain, totalFunds);

    return {
      chipsGain: chipsGain,
      funds: totalFunds,
      originalChipsGain: originalChipsGain
    };
  }


  private calculateRoundMaxPrizes(finalSeedAmount: number): number[] {
    const prizes: number[] = [];
    const basePrize = finalSeedAmount / 3.0;

    for (let i = 1; i <= 5; i++) {
      const prize = (i / 5.0) * basePrize;
      prizes.push(Math.round(prize > 0 ? prize : 1));
    }

    return prizes;
  }

  async initializeRoundMaxPrizes(roomId: string, finalSeedAmount: number): Promise<void> {
    try {
      /* 주석 제거 하지 말 것
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
      */

      const roundPrizes = this.calculateRoundMaxPrizes(finalSeedAmount);
      this.getRoomState(roomId).roundMaxPrizes = roundPrizes;
    } catch (error) {
      // 오류 발생 시 기본값 사용
      this.getRoomState(roomId).roundMaxPrizes = [1, 2, 3, 4, 5];
      this.logger.error(`[initializeRoundMaxPrizes] 오류 발생, 기본값 사용: roomId=${roomId}`, error);
    }
  }


  /**
   * 방에서 퇴장할 때 유저의 칩 정보를 DB에 저장합니다.
   */
  async saveUserChipsOnLeave(roomId: string, userId: string): Promise<{ success: boolean; silverChip: number; goldChip: number }> {
    try {
      const roomState = this.getRoomState(roomId);
      const userChips = roomState.userChipsMap.get(userId);

      // 현재 DB에 저장된 칩 정보 가져오기
      const currentDbChips = await this.userService.getUserChips(userId);
      const chipType = roomState.chipSettings.chipType;

      // 칩 타입에 따라 적절한 칩 정보 업데이트
      let silverChip = currentDbChips.silverChip;
      let goldChip = currentDbChips.goldChip;

      if (userChips) {
        // userChips가 있으면 게임 중 변경된 칩 정보로 업데이트
        if (chipType === ChipType.SILVER) {
          silverChip = userChips.chips;  // 실버 칩 타입인 경우 실버 칩만 업데이트
        } else if (chipType === ChipType.GOLD) {
          goldChip = userChips.chips;    // 골드 칩 타입인 경우 골드 칩만 업데이트
        }

        const success = await this.userService.saveUserChips(
          userId,
          silverChip,
          goldChip
        );

        if (!success) {
          this.logger.error(`[saveUserChipsOnLeave] 칩 정보 저장 실패: roomId=${roomId}, userId=${userId}`);
        }

        return { success: true, silverChip, goldChip };
      } else {
        return { success: true, silverChip, goldChip };
      }
    } catch (error) {
      this.logger.error(`[saveUserChipsOnLeave] 오류 발생: roomId=${roomId}, userId=${userId}`, error);
      return { success: false, silverChip: 0, goldChip: 0 };
    }
  }

  /**
   * 특별 카드 사용을 처리합니다.
   */
  async processUseSpecialCard(
    roomId: string,
    userId: string,
    cardId: string,
    cards: CardData[]
  ): Promise<{
    success: boolean;
    message: string;
    selectedCards?: CardData[];
    resultCards?: CardData[];
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

      // 클라이언트에서 보낸 CardData와 서버의 firstDeckCards를 매칭
      const isValidCards = cards.every(receivedCard =>
        userFirstDeckCards.some(firstDeckCard =>
          firstDeckCard.suit === receivedCard.suit && firstDeckCard.rank === receivedCard.rank
        )
      );

      if (!isValidCards) {
        const receivedCardIds = cards.map(card => `${card.suit}_${card.rank}`);
        const firstDeckCardIds = userFirstDeckCards.map(card => `${card.suit}_${card.rank}`);
        this.logger.warn(`[processUseSpecialCard] 유효하지 않은 카드들: userId=${userId}, receivedCards=${JSON.stringify(receivedCardIds)}, firstDeckCards=${JSON.stringify(firstDeckCardIds)}`);
        return {
          success: false,
          message: TranslationKeys.InvalidCardCombination
        };
      }


      // 5. 카드 ID에 따른 결과 카드 생성 및 modifiedDeck 수정
      const selectedCards = [...cards];
      let resultCards: CardData[] = [];

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
          // 선택한 카드의 숫자가 2 증가
          resultCards = cards.map(card => ({
            id: card.id,
            suit: card.suit,
            rank: Math.min(card.rank + 2, 13) // 최대 13 (K)
          }));
          this.logger.log(`\x1b[31m  ⬇️  tarot_2 적용: ${cards.map(c => `${c.suit}_${c.rank} → ${c.suit}_${Math.max(c.rank - 2, 1)}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_3':
          // 5장의 무작위 카드가 선택되고, 모두 한 가지 무늬로 변경
          if (userFirstDeckCards.length >= 5) {
            // 무작위로 5장 선택
            const shuffledDeck = [...userFirstDeckCards].sort(() => Math.random() - 0.5);
            const randomCards = shuffledDeck.slice(0, 5);

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
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Hearts
          }));
          this.logger.log(`\x1b[34m  ♠️  tarot_4 적용: ${cards.map(c => `${c.suit}_${c.rank} → Spades_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_5':
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Diamonds
          }));
          this.logger.log(`\x1b[36m  ♦️  tarot_5 적용: ${cards.map(c => `${c.suit}_${c.rank} → Diamonds_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_6':
          resultCards = cards.map(card => ({
            ...card,
            id: card.id,
            suit: CardType.Spades
          }));
          this.logger.log(`\x1b[31m  ♥️  tarot_6 적용: ${cards.map(c => `${c.suit}_${c.rank} → Hearts_${c.rank}`).join(', ')}\x1b[0m`);
          break;

        case 'tarot_7':
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
              const deckIndex = modifiedDeck.findIndex((deckCard: CardData) =>
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
          const deckIndex = modifiedDeck.findIndex((card: CardData) =>
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
    roundResult: Record<string, RoundResult>;
  }> {
    try {
      const roomState = this.getRoomState(roomId);
      const allHandPlayCards = roomState.handPlayMap;

      if (!allHandPlayCards || allHandPlayCards.size === 0) {
        this.logger.error(`[processHandPlayResult] allHandPlayCards not found: roomId=${roomId}`);
        return {
          roundResult: {},
        };
      }

      // 각 유저의 funds 변화를 추적하기 위한 맵
      const fundsBeforeMap: Map<string, number> = new Map();

      const ownedCards: Record<string, SpecialCardData[]> = {};
      for (const uid of userIds) {
        ownedCards[uid] = this.getUserOwnedCards(roomId, uid);

        // funds 변화 추적을 위해 현재 funds 저장
        const currentChips = await this.getUserChips(roomId, uid);
        fundsBeforeMap.set(uid, currentChips.funds);
      }

      // playing 상태인 유저들의 점수 계산
      const { userScores, discardFundsMap, randomValueMap } = await this.calculateUserScores(roomId, userIds, allHandPlayCards, ownedCards);

      // 승자 판정 및 시드머니 분배 계산
      const { winners, maxScore, allScores } = this.determineWinners(userIds, userScores);

      // 전체 시드머니 납부 금액 계산
      const allPayments = this.getAllUserSeedMoneyPayments(roomId);
      let totalChips = 0;
      let totalFunds = 0;

      for (const [uid, payment] of allPayments.entries()) {
        totalChips += payment.payment;
      }

      this.logger.log(
        `[processHandPlayResult] 시드머니 분배 준비: ` +
        `전체시드머니(chips=${totalChips}, funds=${totalFunds}), ` +
        `승자수=${winners.length}, ` +
        `점수분포=${JSON.stringify(allScores.map(s => ({ userId: s.userId, score: s.score })))}`
      );

      // 각 유저별 결과 처리
      const roundResult: Record<string, RoundResult> = {};
      // 라운드 종료 시 시드머니 납부 기록을 일괄 차감하기 위한 누적 맵
      const seedPaymentReductions: Map<string, { chips: number }> = new Map();


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
        let isWinner = -1;

        // 현재 라운드의 최대 상금 가져오기
        const roundNumber = this.getRound(roomId);
        let roundMaxPrize = this.getRoundMaxPrize(roomId, roundNumber);
        if (roundNumber === 5) {
          roundMaxPrize = this.getTableChips(roomId);
        }

        if (winners.length > 0 && winners.some(w => w.userId === userId)) {
          isWinner = 1;

          // 승자인 경우
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자인 경우
            // 각 패자에게서 가져올 수 있는 금액 = min(자신이낸금액, 패자가낸금액, 라운드별최대상금)
            let totalChipsFromLosers = 0;

            // 시드머니를 납부한 유저 ID들로 for문 돌기
            for (const [uid, payment] of allPayments) {
              if (uid !== userId) { // 패자들만
                const chipsFromThisLoser = Math.min(userPayment.payment, payment.payment, roundMaxPrize);

                totalChipsFromLosers += chipsFromThisLoser;
              }
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) + 패자들에게서 가져온 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            chipsGain = limitedChips + totalChipsFromLosers;
            // 일괄 차감을 위해 누적
            const prev1 = seedPaymentReductions.get(userId) || { chips: 0 };
            seedPaymentReductions.set(userId, { chips: prev1.chips + limitedChips });

            this.logger.log(
              `[processHandPlayResult] ${userId} 단독 승자 분배: ` +
              `자신납부(chips=${userPayment.payment}), ` +
              `패자들에게서받음(chips=${totalChipsFromLosers}), ` +
              `총획득(chips=${chipsGain})`
            );
          } else {
            // 공동 승자인 경우
            // 각 승자는 자신이 납부한 금액만큼만 다른 유저들에게서 가져갈 수 있음
            let totalChipsFromLosers = 0;
            // 시드머니를 납부한 유저 ID들로 for문 돌기
            for (const [uid, payment] of allPayments) {
              if (!winners.some(w => w.userId === uid)) { // 패자들만
                // 각 승자가 가져갈 수 있는 금액 = min(자신이낸금액, 패자가낸금액, 라운드별최대상금) / 승자수
                let chipsPerWinner = Math.min(userPayment.payment, payment.payment, roundMaxPrize);
                chipsPerWinner = Math.floor(chipsPerWinner / winners.length);
                totalChipsFromLosers += chipsPerWinner;
              }
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) + 패자들에게서 가져온 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            chipsGain = limitedChips + totalChipsFromLosers;
            // 일괄 차감을 위해 누적
            const prev2 = seedPaymentReductions.get(userId) || { chips: 0 };
            seedPaymentReductions.set(userId, { chips: prev2.chips + limitedChips });

            this.logger.log(
              `[processHandPlayResult] ${userId} 공동 승자 분배: ` +
              `자신납부(chips=${userPayment.payment}), ` +
              `패자들에게서받음(chips=${totalChipsFromLosers}), ` +
              `총획득(chips=${chipsGain})`
            );
          }
        } else {
          // 패자인 경우 - 자신이 납부한 시드머니에서 승자에게 빼앗긴 금액을 제외하고 돌려받음
          const userPayment = this.getUserSeedMoneyPayment(roomId, userId);

          if (winners.length === 1) {
            // 단독 승자가 있는 경우
            const winnerPayment = this.getUserSeedMoneyPayment(roomId, winners[0].userId);
            const takenByWinnerChips = Math.min(userPayment.payment, winnerPayment.payment, roundMaxPrize);

            // 자신이 낸 금액(라운드별 상금 제한 적용) - 승자에게 빼앗긴 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            chipsGain = limitedChips - takenByWinnerChips;
            // 일괄 차감을 위해 누적
            const prev3 = seedPaymentReductions.get(userId) || { chips: 0 };
            seedPaymentReductions.set(userId, { chips: prev3.chips + limitedChips });

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불: ` +
              `자신납부(chips=${userPayment.payment}), ` +
              `승자에게빼앗김(chips=${takenByWinnerChips}), ` +
              `환불량(chips=${chipsGain})`
            );
          } else if (winners.length > 1) {
            // 공동 승자가 있는 경우
            let totalTakenChips = 0;

            for (const winner of winners) {
              const winnerPayment = this.getUserSeedMoneyPayment(roomId, winner.userId);
              // 각 승자가 가져갈 수 있는 금액 = min(승자가낸금액, 패자가낸금액, 라운드별최대상금) / 승자수
              let chipsPerWinner = Math.min(winnerPayment.payment, userPayment.payment, roundMaxPrize);
              chipsPerWinner = Math.floor(chipsPerWinner / winners.length);

              totalTakenChips += chipsPerWinner;
            }

            // 자신이 낸 금액(라운드별 상금 제한 적용) - 승자들에게 빼앗긴 금액
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            chipsGain = limitedChips - totalTakenChips;
            // 일괄 차감을 위해 누적
            const prev4 = seedPaymentReductions.get(userId) || { chips: 0 };
            seedPaymentReductions.set(userId, { chips: prev4.chips + limitedChips });

            this.logger.log(
              `[processHandPlayResult] ${userId} 패자 환불(공동승자): ` +
              `자신납부(chips=${userPayment.payment}), ` +
              `승자들에게빼앗김(chips=${totalTakenChips}), ` +
              `환불량(chips=${chipsGain})`
            );
          } else {
            isWinner = 0;
            // 승자가 없는 경우 (모든 점수가 0) - 라운드별 상금 제한 적용
            const limitedChips = Math.min(userPayment.payment, roundMaxPrize);
            chipsGain = limitedChips;
            // 일괄 차감을 위해 누적
            const prev5 = seedPaymentReductions.get(userId) || { chips: 0 };
            seedPaymentReductions.set(userId, { chips: prev5.chips + limitedChips });

            this.logger.log(
              `[processHandPlayResult] ${userId} 무승부 환불: ` +
              `자신납부(chips=${userPayment.payment}), ` +
              `환불량(chips=${chipsGain})`
            );
          }
        }

        // 승자인 경우 딜러비 차감 (3% 수수료)
        const originalChipsGain = chipsGain;
        if (isWinner === 1 && chipsGain > 0 && roomState.chipSettings.chipType === ChipType.GOLD) {
          const dealerFee = Math.floor(chipsGain * 0.03);
          chipsGain -= dealerFee;
          this.logger.log(
            `[processHandPlayResult] ${userId} 딜러비 차감: ` +
            `원래획득(chips=${originalChipsGain}), ` +
            `딜러비(chips=${dealerFee}), ` +
            `최종획득(chips=${chipsGain})`
          );
        }

        // 유저 칩 업데이트
        const updateSuccess = await this.updateUserChips(
          roomId,
          userId,
          chipsGain,
          // fundsGain
        );

        if (!updateSuccess) {
          this.logger.error(`[processHandPlayResult] 칩 업데이트 실패: userId=${userId}`);
          throw new Error('칩 업데이트 실패');
        }

        // 현재 라운드 정보 가져오기
        const currentRound = this.getRound(roomId);

        // 순위별 funds 지급 (동률 처리 포함)
        const rankFunds = await this.distributeRankFunds(roomId, userIds, userScores, userId, currentRound);

        // 업데이트된 칩 정보 가져오기
        const finalUpdatedChips = await this.getUserChips(roomId, userId);

        // 버리기 funds와 순위 funds 계산
        const discardRemainingFunds = discardFundsMap[userId] || 0;
        const totalFundsGain = discardRemainingFunds + rankFunds;

        this.logger.log(
          `[processHandPlayResult] ${userId} 결과: ` +
          `점수=${finalScore}, ` +
          `승자여부=${winners.some(w => w.userId === userId)}, ` +
          `획득량(chips=${chipsGain}), ` +
          `버리기funds=${discardRemainingFunds}, ` +
          `순위funds=${rankFunds}, ` +
          `총funds=${totalFundsGain}, ` +
          `최종(chips=${finalUpdatedChips.chips})`
        );

        // 유저 닉네임 가져오기 (저장된 닉네임 사용)
        const nickname = this.getUserNickname(roomId, userId);

        this.logger.log(`랜덤값 보냄 randomValueMap[${userId}]: ${JSON.stringify(randomValueMap[userId])}`);

        roundResult[userId] = {
          isWinner: isWinner,
          usedHand: playedHand,
          fullHand: fullHand,
          score: finalScore,
          chipsGain: chipsGain,
          originalChipsGain: originalChipsGain,
          discardRemainingFunds: discardRemainingFunds,
          rankFunds: rankFunds,
          totalFundsGain: totalFundsGain,
          finalChips: finalUpdatedChips.chips,
          finalFunds: finalUpdatedChips.funds,
          remainingDiscards,
          remainingDeck: remainingDeck,
          totalDeck: this.getUserTotalDeckCards(roomId, userId),
          remainingSevens,
          nickname: nickname,
          randomValue: randomValueMap[userId],
        };
      }

      // 여기에서 시드머니 업데이트 기록 일괄 처리 할 것
      for (const [uid, reduce] of seedPaymentReductions.entries()) {
        this.updateSeedMoneyPayment(roomId, uid, reduce.chips);
        this.logger.log(`[processHandPlayResult] 시드머니 납부 기록 일괄 차감: userId=${uid}, chips=${reduce.chips}`);
      }

      // SILVER 방일 때 총 스코어 업데이트
      if (roomState.chipSettings.chipType === ChipType.SILVER) {
        // 모든 유저의 점수를 총 스코어에 더함
        let roundTotalScore = 0;
        for (const userId of userIds) {
          const userScore = userScores[userId] || 0;
          roundTotalScore += userScore;
        }

        roomState.silverTotalScore += roundTotalScore;

        this.logger.log(
          `[processHandPlayResult] SILVER 방 총 스코어 업데이트: ` +
          `라운드점수=${roundTotalScore}, 누적총점=${roomState.silverTotalScore}, roomId=${roomId}`
        );
      }

      return {
        roundResult
      };
    } catch (error) {
      this.logger.error(`[processHandPlayResult] Error: roomId=${roomId}`, error);
      throw error;
    }
  }

  /**
   * 방장을 설정합니다.
   */
  setRoomOwner(roomId: string, userId: string): void {
    const roomState = this.getRoomState(roomId);
    roomState.roomOwnerId = userId;
    this.logger.log(`[setRoomOwner] 방장 설정: roomId=${roomId}, ownerId=${userId}`);
  }

  /**
   * 방장을 가져옵니다.
   */
  getRoomOwner(roomId: string): string | null {
    return this.getRoomState(roomId).roomOwnerId;
  }

  /**
   * 새로운 방장을 선택합니다 (첫 번째 유저를 방장으로 설정).
   */
  selectNewRoomOwner(roomId: string): string | null {
    const roomState = this.getRoomState(roomId);
    const userIds = Array.from(roomState.userStatusMap.keys());

    if (userIds.length > 0) {
      const newOwnerId = userIds[0];
      roomState.roomOwnerId = newOwnerId;
      this.logger.log(`[selectNewRoomOwner] 새로운 방장 선택: roomId=${roomId}, newOwnerId=${newOwnerId}`);
      return newOwnerId;
    } else {
      roomState.roomOwnerId = null;
      this.logger.log(`[selectNewRoomOwner] 방에 유저가 없어 방장 해제: roomId=${roomId}`);
      return null;
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
  ): Promise<number> {
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
    let rankFunds = 0;
    if (currentUser && currentUser.rank) {
      rankFunds = await this.gameSettingsService.getRoundRankFunds(currentRound, currentUser.rank);
      await this.updateUserFunds(roomId, currentUserId, rankFunds);

      this.logger.log(
        `[processHandPlayResult] 순위별 funds 지급: ` +
        `라운드=${currentRound}, 순위=${currentUser.rank}, 유저=${currentUserId}, 점수=${userScores[currentUserId]}, 지급funds=${rankFunds}`
      );
    }

    return rankFunds;
  }

  /**
   * 유저들의 점수를 계산합니다.
   */
  private async calculateUserScores(
    roomId: string,
    userIds: string[],
    allHandPlayCards: Map<string, CardData[]>,
    ownedCards: Record<string, SpecialCardData[]>
  ): Promise<{
    userScores: Record<string, number>;
    discardFundsMap: Record<string, number>;
    randomValueMap: Record<string, RandomValue[]>;
  }> {
    const userScores: Record<string, number> = {};
    const discardFundsMap: Record<string, number> = {};
    const randomValueMap: Record<string, RandomValue[]> = {};

    for (const userId of userIds) {
      // 남은 버리기 횟수 계산
      let remainingDiscards = 4;
      const discardUserMap = this.getDiscardCountMap(roomId);
      if (discardUserMap) {
        const used = discardUserMap.get(userId) ?? 0;
        remainingDiscards = 4 - used;
      }

      // 게임 설정에서 버리기 남은 횟수에 따른 지급 funds 값 가져오기
      let totalDiscardFunds = 0;
      if (remainingDiscards > 0) {
        const discardRemainingFunds = await this.gameSettingsService.getDiscardRemainingFunds();
        totalDiscardFunds = discardRemainingFunds * remainingDiscards;
        await this.updateUserFunds(roomId, userId, totalDiscardFunds);

        this.logger.log(
          `[processHandPlayResult] 버리기 funds 지급: ` +
          `유저=${userId}, 남은버리기=${remainingDiscards}, 기본값=${discardRemainingFunds}, 지급funds=${totalDiscardFunds}`
        );
      }

      discardFundsMap[userId] = totalDiscardFunds;

      const { remainingDeck, remainingSevens, totalDeck } = this.getUserDeckInfo(roomId, userId);

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
          totalDeck
        );

        randomValueMap[userId] = scoreResult.randomValue;

        finalChips = scoreResult.chips;
        finalMultiplier = scoreResult.multiplier;
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

    return { userScores, discardFundsMap, randomValueMap };
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
      const cardEnhancements = this.getUserCardEnhancements(roomId, uid);

      userInfo[uid] = {
        chips: userChips.chips,
        funds: userChips.funds,
        isPlaying,
        ownedCards: ownedCards.map(card => card.id),
        paytableLevels,
        paytableBaseChips,
        paytableMultipliers,
        cardEnhancements
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
    chipsTable: number;     // 테이블의 총 칩
    chipsRound: number;     // 현재 라운드에서 획득 가능한 판돈
    userInfo: Record<string, any>;
  }> {
    const myCards = this.getUserHand(roomId, userId);
    const round = this.getRound(roomId);
    const chipType = this.getRoomState(roomId).chipSettings.chipType;
    const seedAmount = this.getSeedChip(roomId);
    // const bettingAmount = this.getCurrentBettingAmount(roomId);

    // 내 덱의 총 카드 수 계산 (초기 총 개수 표시용으로 핸드 카드 8장 포함)
    const gameState = this.gameStates.get(roomId);
    let totalDeckCards = 0;
    if (gameState && gameState.decks.has(userId)) {
      totalDeckCards = (gameState.decks.get(userId)?.length || 0) + 8; // 덱 카드 + 핸드 카드 8장
      this.getRoomState(roomId).userTotalDeckCardsMap.set(userId, totalDeckCards);
    }

    // 현재 라운드에서 획득 가능한 판돈 계산
    const chipsRound = this.getRoundChips(roomId, false);

    // 실제 테이블 칩 계산 (시드머니 납부 기록에서) 후 라운드머니로 나간것 빼기
    const chipsTable = this.getTableChips(roomId) - chipsRound;

    const userInfo: Record<string, any> = {};

    // playing 상태인 유저들만 필터링
    const playingUserIds = this.getPlayingUserIds(roomId, userIds);

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
      // bettingAmount,
      chipsTable,
      chipsRound,
      userInfo
    };
  }


  getRoundChips(roomId: string, isNextRound: boolean) {
    const round = isNextRound ? this.getRound(roomId) + 1 : this.getRound(roomId);

    if (round >= 5) {
      return this.getTableChips(roomId);
    }

    const baseRoundPrize = this.getRoundMaxPrize(roomId, round) || 0; // 기본 라운드 상금    
    const roomUserIds = this.getRoomUserIds(roomId);

    // 실제 시드머니 납부액의 합 계산
    let chipsRound = 0;
    for (const uid of roomUserIds) {
      const seedPayment = this.getUserSeedMoneyPayment(roomId, uid);
      chipsRound += Math.min(baseRoundPrize, seedPayment.payment);
    }
    return chipsRound;
  }

  // === 유저별 게임 상태 관리 메서드들 ===

  /**
   * 유저의 게임 상태를 설정합니다.
   */
  setUserStatus(roomId: string, userId: string, status: 'waiting' | 'playing'): void {
    this.getRoomState(roomId).userStatusMap.set(userId, status);
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
  }

  /**
   * 방의 모든 유저 상태를 playing으로 설정합니다.
   */
  setAllUsersToPlaying(roomId: string, userIds: string[]): void {
    const roomState = this.getRoomState(roomId);
    userIds.forEach(userId => {
      roomState.userStatusMap.set(userId, 'playing');
    });
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

    Object.values(PokerHand).forEach(hand => {
      if (hand !== PokerHand.None) {
        multipliers[hand as string] = this.paytableService.getMultiplier(userId, hand as PokerHand);
      }
    });

    return multipliers;
  }

  /**
   * 유저의 카드별 성장값을 가져옵니다.
   */
  getUserCardEnhancements(roomId: string, userId: string): Record<string, { enhanceChips: number; enhanceMul: number }> {
    return this.paytableService.getUserCardEnhancements(userId);
  }

  /**
   * 마지막 플레이어 승리 처리를 합니다.
   * 게임 중인 유저가 1명만 남았을 때 호출됩니다.
   */
  async handleLastPlayerWin(roomId: string): Promise<{
    success: boolean;
    lastWinnerId?: string;
    chipsGain?: number;
    originalChipsGain?: number;
    finalChips?: number;
  }> {
    try {
      // 게임 중인 유저 수 확인
      const playingUsers = this.getPlayingUserIds(roomId);

      if (playingUsers.length === 1) {
        const lastPlayerId = playingUsers[0];

        // 마지막 플레이어 보상 계산
        const rewards = await this.calculateLastPlayerRewards(roomId, lastPlayerId);

        // 게임 종료 처리 및 새 게임 시작
        await this.handleGameEnd(roomId);


        // 마지막 승자의 최종 칩 정보 가져오기
        const lastPlayerChips = await this.getUserChips(roomId, lastPlayerId);

        this.logger.log(
          `[handleLastPlayerWin] 마지막 플레이어 승리: roomId=${roomId}, lastPlayerId=${lastPlayerId}, chipsReward=${rewards.chipsGain}`
        );

        return {
          success: true,
          lastWinnerId: lastPlayerId,
          chipsGain: rewards.chipsGain,
          originalChipsGain: rewards.originalChipsGain,
          finalChips: lastPlayerChips.chips
        };
      }

      return {
        success: false
      };
    } catch (error) {
      this.logger.error(
        `[handleLastPlayerWin] Error in handleLastPlayerWin: roomId=${roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        success: false
      };
    }
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
  }> {
    try {
      const roomState = this.getRoomState(roomId);

      // 1. shop 단계인지 확인
      // if (roomState.phase !== 'shop') {
      //   return {
      //     success: false,
      //     message: TranslationKeys.FoldShopPhaseOnly
      //   };
      // }

      // 2. 유저가 playing 상태인지 확인
      if (!this.isUserPlaying(roomId, userId)) {
        return {
          success: false,
          message: TranslationKeys.FoldPlayingStatusOnly
        };
      }

      // 3. 유저 상태를 waiting으로 변경
      this.setUserStatus(roomId, userId, 'waiting');

      return {
        success: true,
        message: TranslationKeys.FoldCompleted,
        userId: userId,
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

  // === 베팅 관련 메서드들 ===

  /**
   * 베팅 라운드를 시작합니다.
   */
  startBettingRound(roomId: string): void {
    const roomState = this.getRoomState(roomId);
    const playingUsers = this.getPlayingUserIds(roomId);
    const initialTableChips = this.getRoundMaxPrize(roomId, 5) * playingUsers.length;

    // 모든 유저의 초기 콜머니를 0으로 설정
    const userCallChips = new Map();
    for (const userId of playingUsers) {
      userCallChips.set(userId, 0);
    }

    roomState.bettingState = {
      currentUser: playingUsers[0], // 첫 번째 유저부터 시작
      tableChips: this.getTableChips(roomId),
      userCallChips: userCallChips, // 각 유저별 콜머니 초기화
      order: [...playingUsers],
      completed: new Set(),
      bets: new Map(),
      raiseCounts: new Map(), // 각 유저의 레이스 횟수 초기화
      checkUsed: false, // check 사용 여부 초기화
      remainingTableMoney: initialTableChips, // 레이스 가능한 남은 테이블 머니 한도 초기화      
      initialTableChips: initialTableChips // 라운드 시작 시 테이블칩 저장
    };
  }

  /**
   * 베팅 금액을 계산합니다.
   */
  calculateBettingAmount(bettingType: BettingType, callChips: number, tableChips: number, userChips: number, remainingTableMoney: number): number {
    let calculatedAmount: number;

    switch (bettingType) {
      case BettingType.CHECK: return 0;
      case BettingType.CALL: calculatedAmount = callChips; break;
      case BettingType.QUARTER:
        calculatedAmount = callChips + Math.ceil(tableChips * 0.25);
        break;
      case BettingType.HALF:
        calculatedAmount = callChips + Math.ceil(tableChips * 0.5);
        break;
      case BettingType.FULL:
        calculatedAmount = callChips + (tableChips);
        break;
      case BettingType.FOLD: return 0;
      default: calculatedAmount = callChips;
    }

    return Math.min(calculatedAmount, userChips, remainingTableMoney + callChips);


    // 주석 제거 하지 말것 - 나중에 복구 할수도 있음
    // let calculatedAmount: number;

    // switch (bettingType) {
    //   case BettingType.CHECK: return 0;
    //   case BettingType.CALL: calculatedAmount = callChips; break;
    //   case BettingType.BBING: calculatedAmount = callChips + 1; break;
    //   case BettingType.DDADANG: calculatedAmount = callChips + (callChips * 2); break;
    //   case BettingType.QUARTER:
    //     // 콜 머니를 먼저 받고, 그 다음에 남은 테이블 머니에서 1/4 계산
    //     calculatedAmount = callChips + Math.ceil((remainingTableMoney + callChips) * 0.25);
    //     break;
    //   case BettingType.HALF:
    //     // 콜 머니를 먼저 받고, 그 다음에 남은 테이블 머니에서 1/2 계산
    //     calculatedAmount = callChips + Math.ceil((remainingTableMoney + callChips) * 0.5);
    //     break;
    //   case BettingType.FULL:
    //     // 콜 머니를 먼저 받고, 그 다음에 남은 테이블 머니 전체
    //     calculatedAmount = callChips + (remainingTableMoney + callChips);
    //     break;
    //   case BettingType.FOLD: return 0;
    //   default: calculatedAmount = callChips;
    // }

    // // 유저 보유 칩과 남은 테이블 머니로 제한 (레이스인 경우에만)
    //   return Math.min(calculatedAmount, userChips, remainingTableMoney + callChips);

  }

  /**
   * 베팅 가능 여부를 확인합니다.
   */
  isBettingPossible(bettingType: BettingType, callChips: number): boolean {
    switch (bettingType) {
      case BettingType.CHECK: return callChips === 0;
      case BettingType.FOLD: return true;
      default: return true; // 나머지는 항상 가능
    }
  }

  /**
   * 레이스인지 확인합니다.
   */
  isRaise(bettingType: BettingType): boolean {
    return bettingType === BettingType.QUARTER ||
      bettingType === BettingType.HALF ||
      bettingType === BettingType.FULL;
  }

  /**
   * 베팅을 처리합니다.
   */
  async processBetting(roomId: string, userId: string, bettingType: BettingType): Promise<{
    userId: string;
    bettingType: BettingType;
    bettingAmount: number;
    tableChips: number;
    callChips: number;
  }> {
    const roomState = this.getRoomState(roomId);
    const bettingState = roomState.bettingState;
    const userChips = await this.getUserChips(roomId, userId);

    // FOLD 처리
    if (bettingType === BettingType.FOLD) {
      await this.handleFold(roomId, userId);

      // 베팅 정보 저장 (FOLD는 베팅 금액 0)
      bettingState.bets.set(userId, {
        type: bettingType,
        amount: 0
      });

      return {
        userId,
        bettingType,
        bettingAmount: 0,
        tableChips: bettingState.tableChips,
        callChips: bettingState.userCallChips.get(userId) || 0
      };
    }

    // 일반 베팅 처리
    const userCallChips = bettingState.userCallChips.get(userId) || 0;
    const bettingAmount = this.calculateBettingAmount(bettingType, userCallChips, bettingState.initialTableChips, userChips.chips, bettingState.remainingTableMoney);

    // 베팅 정보 저장
    bettingState.bets.set(userId, {
      type: bettingType,
      amount: bettingAmount
    });

    // 테이블 칩 업데이트
    bettingState.tableChips += bettingAmount;

    // CHECK인 경우 checkUsed를 true로 설정
    if (bettingType === BettingType.CHECK) {
      bettingState.checkUsed = true;
    }

    // 레이스인 경우 모든 유저의 베팅 상태 초기화 및 레이스 횟수 증가
    if (this.isRaise(bettingType)) {
      // 레이스 금액만큼 남은 테이블 머니 차감
      const raiseAmount = bettingAmount - userCallChips; // 실제 레이스 금액

      // 모든 유저의 콜머니에 레이스 금액 추가
      for (const [uid, currentCallChips] of bettingState.userCallChips) {
        bettingState.userCallChips.set(uid, currentCallChips + raiseAmount);
      }

      bettingState.remainingTableMoney -= raiseAmount;

      bettingState.completed.clear();

      // 현재 유저의 레이스 횟수 증가
      const currentRaiseCount = bettingState.raiseCounts.get(userId) || 0;
      bettingState.raiseCounts.set(userId, currentRaiseCount + 1);
    }

    // 베팅 완료 처리
    bettingState.completed.add(userId);
    bettingState.userCallChips.set(userId, 0);

    // 유저 칩 차감
    this.updateUserChips(roomId, userId, -bettingAmount);

    // 유저 납부 내역에 차감한 만큼 추가
    const currentPayment = roomState.userSeedMoneyPayments.get(userId) || { payment: 0 };
    roomState.userSeedMoneyPayments.set(userId, {
      payment: currentPayment.payment + bettingAmount // 베팅한 금액만큼 추가
    });

    return {
      userId,
      bettingType,
      bettingAmount,
      tableChips: bettingState.tableChips,
      callChips: bettingState.userCallChips.get(userId) || 0
    };
  }

  /**
   * 다음 베팅 유저를 설정합니다.
   */
  setNextBettingUser(roomId: string): string | null {
    const roomState = this.getRoomState(roomId);
    const bettingState = roomState.bettingState;

    if (!bettingState.currentUser) return null;

    const currentIndex = bettingState.order.indexOf(bettingState.currentUser);
    let nextIndex = (currentIndex + 1) % bettingState.order.length;
    let nextUser = bettingState.order[nextIndex];
    let attempts = 0; // 무한 루프 방지

    // waiting 상태가 아닌 유저를 찾을 때까지 반복
    while (attempts < bettingState.order.length) {
      const userStatus = this.getUserStatus(roomId, nextUser);
      if (userStatus === 'playing') {
        break; // playing 상태인 유저를 찾았으면 종료
      }

      // 다음 유저로 이동
      nextIndex = (nextIndex + 1) % bettingState.order.length;
      nextUser = bettingState.order[nextIndex];
      attempts++;
    }

    // 모든 유저가 waiting 상태인 경우 null 반환
    if (attempts >= bettingState.order.length) {
      this.logger.warn(`[setNextBettingUser] 모든 유저가 waiting 상태: roomId=${roomId}`);
      return null;
    }

    bettingState.currentUser = nextUser;

    return nextUser;
  }

  /**
   * 베팅 라운드가 완료되었는지 확인합니다.
   */
  isBettingRoundComplete(roomId: string): boolean {
    const roomState = this.getRoomState(roomId);
    const bettingState = roomState.bettingState;

    // playing 상태인 유저만 카운트
    let playingUserCount = 0;
    for (const userId of bettingState.order) {
      const userStatus = this.getUserStatus(roomId, userId);
      if (userStatus === 'playing') {
        playingUserCount++;
      }
    }

    return bettingState.completed.size === playingUserCount;
  }

  /**
   * 베팅 요청 정보를 생성합니다.
   */
  async createBettingResponse(roomId: string, isFirst: boolean = false): Promise<Partial<BettingResponseDto>> {
    const roomState = this.getRoomState(roomId);
    const bettingState = roomState.bettingState;
    const currentUserId = bettingState.currentUser || '';

    // 현재 베팅 유저의 보유 칩 가져오기
    const userChips = currentUserId ? await this.getUserChips(roomId, currentUserId) : { chips: 0 };
    const availableChips = userChips.chips;

    // check는 최초 베팅하는 사람만 1번 가능 (callChips가 0이고 아직 check를 사용하지 않았을 때)
    const userCallChips = bettingState.userCallChips.get(currentUserId) || 0;
    const canCheck = userCallChips === 0 && !bettingState.checkUsed;
    // call은 누군가 베팅했거나(checkUsed) 누군가 체크했을 때만 가능
    const canCall = userCallChips > 0 || bettingState.checkUsed;

    // 콜 후 남은 칩이 있을 때만 레이스 가능
    const callAmount = Math.min(userCallChips, availableChips);
    const remainingChipsAfterCall = availableChips - callAmount;

    // 현재 유저의 레이스 횟수 확인
    const currentRaiseCount = bettingState.raiseCounts.get(currentUserId) || 0;

    const canRaise = bettingState.tableChips > 0 &&
      bettingState.tableChips > (bettingState.userCallChips.get(currentUserId) || 0) &&
      remainingChipsAfterCall > 0 &&
      currentRaiseCount < 2 && // 최대 2번까지만 레이스 가능
      bettingState.remainingTableMoney > 0; // 남은 테이블 머니가 있어야 레이스 가능

    // 각 베팅 타입별 금액 계산 (실제 유저 보유 칩 사용)
    const quarterAmount = this.calculateBettingAmount(BettingType.QUARTER, userCallChips, bettingState.initialTableChips, availableChips, bettingState.remainingTableMoney);
    const halfAmount = this.calculateBettingAmount(BettingType.HALF, userCallChips, bettingState.initialTableChips, availableChips, bettingState.remainingTableMoney);
    const fullAmount = this.calculateBettingAmount(BettingType.FULL, userCallChips, bettingState.initialTableChips, availableChips, bettingState.remainingTableMoney);
    const callAmountCalculated = this.calculateBettingAmount(BettingType.CALL, userCallChips, bettingState.initialTableChips, availableChips, bettingState.remainingTableMoney);

    return {
      currentUserId,
      tableChips: bettingState.tableChips,
      callChips: userCallChips,
      canRaise,
      canCheck,
      canCall,
      quarterAmount,
      halfAmount,
      fullAmount,
      callAmount: callAmountCalculated,
      isFirst
    };
  }


  /**
   * 유저가 속한 게임룸 ID를 반환합니다.
   */
  public getUserRoomId(userId: string): string | null {
    // 모든 게임룸을 순회하여 유저가 속한 룸 찾기
    for (const [roomId, roomState] of this.gameStates.entries()) {
      // userChipsMap에 유저가 있으면 해당 룸에 속한 것
      if (roomState.userChipsMap.has(userId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * 입장 제한 머니를 계산합니다.
   */
  private calculateEntryRequirement(seedAmount: number): number {
    // 정수 연산으로 정확한 계산 (올림)
    return Math.ceil((110 * seedAmount) / 3);
  }

  /**
   * 플레이 제한 머니를 계산합니다.
   */
  private calculatePlayRequirement(seedAmount: number): number {
    return Math.round((110.0 / 3.0) * seedAmount / 10);
  }

  // === 테스트 조커 관련 메서드들 ===

  /**
   * 테스트 조커 ID를 설정합니다.
   */
  setTestJokerIds(roomId: string, testJokerIds: string[]): {
    success: boolean;
    message: string;
    testJokerIds: string[];
  } {
    try {
      const roomState = this.getRoomState(roomId);

      // 배열 길이 검증 (5개 슬롯)
      if (testJokerIds.length !== 5) {
        return {
          success: false,
          message: '테스트 조커 ID는 5개여야 합니다.',
          testJokerIds: roomState.testJokerIds
        };
      }

      // 유효한 카드 ID 검증
      for (const jokerId of testJokerIds) {
        if (jokerId && jokerId.trim() !== '') {
          const card = this.specialCardManagerService.getCardById(jokerId);
          if (!card) {
            return {
              success: false,
              message: `유효하지 않은 카드 ID: ${jokerId}`,
              testJokerIds: roomState.testJokerIds
            };
          }
        }
      }

      // 테스트 조커 ID 설정
      roomState.testJokerIds = [...testJokerIds];

      return {
        success: true,
        message: '테스트 조커 ID가 성공적으로 설정되었습니다.',
        testJokerIds: roomState.testJokerIds
      };
    } catch (error) {
      this.logger.error(`[setTestJokerIds] Error: roomId=${roomId}`, error);
      return {
        success: false,
        message: '테스트 조커 ID 설정 중 오류가 발생했습니다.',
        testJokerIds: []
      };
    }
  }

  /**
   * 강제로 나눠줄 족보를 설정합니다.
   */
  setForcedHand(roomId: string, pokerHand: PokerHand | null): {
    success: boolean;
    message: string;
  } {
    try {
      const roomState = this.getRoomState(roomId);
      roomState.forcedHand = pokerHand;

      return {
        success: true,
        message: pokerHand ? `강제 족보가 ${pokerHand}로 설정되었습니다.` : '강제 족보가 해제되었습니다.'
      };
    } catch (error) {
      this.logger.error(`[setForcedHand] Error: roomId=${roomId}`, error);
      return {
        success: false,
        message: '강제 족보 설정 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 현재 설정된 테스트 조커 ID를 가져옵니다.
   */
  getTestJokerIds(roomId: string): {
    success: boolean;
    message: string;
    testJokerIds: string[];
  } {
    try {
      const roomState = this.getRoomState(roomId);

      return {
        success: true,
        message: '테스트 조커 ID를 성공적으로 가져왔습니다.',
        testJokerIds: [...roomState.testJokerIds]
      };
    } catch (error) {
      this.logger.error(`[getTestJokerIds] Error: roomId=${roomId}`, error);
      return {
        success: false,
        message: '테스트 조커 ID 조회 중 오류가 발생했습니다.',
        testJokerIds: []
      };
    }
  }
}
