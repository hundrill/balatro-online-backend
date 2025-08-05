import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { RoomService } from './room.service';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { LoginRequestDto } from './socket-dto/login-request.dto';
import { NextRoundReadyRequestDto } from './socket-dto/next-round-ready-request.dto';
import { HandPlayReadyRequestDto } from './socket-dto/hand-play-ready-request.dto';
import { ReRollShopRequestDto } from './socket-dto/re-roll-shop-request.dto';
import { BuyCardRequestDto } from './socket-dto/buy-card-request.dto';
import { DiscardRequestDto } from './socket-dto/discard-request.dto';
import { SellCardRequestDto } from './socket-dto/sell-card-request.dto';
import { ReorderJokersRequestDto } from './socket-dto/reorder-jokers-request.dto';
import { ReorderJokersResponseDto } from './socket-dto/reorder-jokers-response.dto';
import { JoinRoomRequestDto } from './socket-dto/join-room-request.dto';
import { LeaveRoomRequestDto } from './socket-dto/leave-room-request.dto';
import { LoginResponseDto } from './socket-dto/login-response.dto';
import { BaseSocketDto } from './socket-dto/base-socket.dto';
import { BuyCardResponseDto } from './socket-dto/buy-card-response.dto';
import { SellCardResponseDto } from './socket-dto/sell-card-response.dto';
import { DiscardResponseDto } from './socket-dto/discard-response.dto';
import { ReRollShopResponseDto } from './socket-dto/re-roll-shop-response.dto';
import { HandPlayResultResponseDto } from './socket-dto/hand-play-result-response.dto';
import { JoinRoomResponseDto } from './socket-dto/join-room-response.dto';
import { LeaveRoomResponseDto } from './socket-dto/leave-room-response.dto';
import { RoomUsersResponseDto } from './socket-dto/room-users-response.dto';
import { StartGameResponseDto } from './socket-dto/start-game-response.dto';
import { HandPlayReadyResponseDto } from './socket-dto/hand-play-ready-response.dto';
import { NextRoundReadyResponseDto } from './socket-dto/next-round-ready-response.dto';
import { ErrorResponseDto } from './socket-dto/error-response.dto';
import { StartGameRequestDto } from './socket-dto/start-game-request.dto';
import { BettingRequestDto } from './socket-dto/betting-request.dto';
import { BettingResponseDto } from './socket-dto/betting-response.dto';
import { UseSpecialCardRequestDto } from './socket-dto/use-special-card-request.dto';
import { UseSpecialCardResponseDto } from './socket-dto/use-special-card-response.dto';
import { SpecialCardManagerService } from './special-card-manager.service';
import { isClientVersionSupported, MIN_CLIENT_VERSION, getVersionString } from '../common/constants/version.constants';
import { DevToolsService } from '../dev-tools/dev-tools.service';
import { GameSettingsService } from '../common/services/game-settings.service';

interface RoomUserInfo {
  userId: string;
  nickname: string | null;
  silverChip: number;
  goldChip: number;
  isPlaying: boolean;
  ownedCards: string[];
  paytableLevels: Record<string, number>;
  paytableBaseChips: Record<string, number>;
  paytableMultipliers: Record<string, number>;
}

@WebSocketGateway({ cors: true })
export class RoomGateway
  implements
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnModuleInit,
  OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomGateway.name);

  private socketIdToUserId: Map<string, string> = new Map();

  private socketIdToRoomIds: Map<string, Set<string>> = new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly specialCardManagerService: SpecialCardManagerService,
    private readonly devToolsService: DevToolsService,
    private readonly gameSettingsService: GameSettingsService,
  ) { }

  afterInit(server: any) {
    this.logger.log('WebSocket server initialized');
  }

  // === 유틸리티 메서드들 ===

  /**
   * 소켓 응답 전송
   */
  private emitUserResponse(client: Socket, res: BaseSocketDto) {
    this.logger.log(`[emitUserResponse] to ${client.id}: ${JSON.stringify(res)}`);
    client.emit('Response', res);
  }

  /**
   * 소켓 ID로 응답 전송
   */
  private emitUserResponseBySocketId(socketId: string, res: BaseSocketDto) {
    this.logger.log(`[emitUserResponseBySocketId] to ${socketId}: ${JSON.stringify(res)}`);
    this.server.to(socketId).emit('Response', res);
  }

  /**
   * 방 전체에 응답 전송
   */
  private emitRoomResponse(roomId: string, res: BaseSocketDto) {
    this.logger.log(`[emitRoomResponse] to ${roomId}: ${JSON.stringify(res)}`);
    this.server.to(roomId).emit('Response', res);
  }

  /**
   * 특정 유저를 제외하고 방의 모든 유저에게 응답 전송
   */
  private emitRoomResponseExceptUser(roomId: string, excludeUserId: string, res: BaseSocketDto) {
    this.logger.log(`[emitRoomResponseExceptUser] to ${roomId} except ${excludeUserId}: ${JSON.stringify(res)}`);

    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);

    if (room) {
      for (const socketId of room) {
        const userId = this.socketIdToUserId.get(socketId);
        if (userId && userId !== excludeUserId) {
          this.emitUserResponseBySocketId(socketId, res);
        }
      }
    }
  }

  /**
   * 방의 모든 userId 배열 추출
   */
  private getRoomUserIds(roomId: string): string[] {
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);
    const userIds: string[] = [];

    if (room) {
      for (const socketId of room) {
        const userId = this.socketIdToUserId.get(socketId);
        if (userId) userIds.push(userId);
      }
    }

    return userIds;
  }

  /**
   * 방 상태 검증
   */
  private validateRoomPhase(roomId: string, expectedPhase: string, userId: string): boolean {
    const currentPhase = this.roomService.getRoomPhase(roomId);
    if (currentPhase !== expectedPhase) {
      this.logger.warn(
        `잘못된 phase에서 요청 무시: userId=${userId}, roomId=${roomId}, phase=${currentPhase}, expected=${expectedPhase}`,
      );
      return false;
    }
    return true;
  }

  /**
   * 사용자 등록 검증
   */
  private validateUserRegistration(client: Socket): string | null {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) {
      this.logger.warn(`userId not found for socketId=${client.id}`);
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'User not registered' }),
      );
      return null;
    }
    return userId;
  }

  /**
   * 현재 방에 접속 중인 유저들의 정보를 반환
   */
  private async getRoomUserInfos(roomId: string): Promise<RoomUserInfo[]> {
    const userIds = this.getRoomUserIds(roomId);

    const users = await Promise.all(
      userIds.map(async (userId) => {
        const user = await this.userService.findByEmail(userId);

        // 유저의 게임 참여 상태 확인
        const isPlaying = this.roomService.isUserPlaying(roomId, userId);

        // 유저가 소유 중인 조커 카드 리스트 가져오기
        const ownedCards = this.roomService.getUserOwnedCards(roomId, userId);

        // 유저의 페이테이블 족보 레벨 정보 가져오기
        const paytableLevels = this.roomService.getUserPaytableLevels(roomId, userId);
        const paytableBaseChips = this.roomService.getUserPaytableBaseChips(roomId, userId);
        const paytableMultipliers = this.roomService.getUserPaytableMultipliers(roomId, userId);

        return user
          ? {
            userId: user.email,
            nickname: user.nickname,
            silverChip: user.silverChip,
            goldChip: user.goldChip,
            isPlaying,
            ownedCards,
            paytableLevels,
            paytableBaseChips,
            paytableMultipliers,
          }
          : {
            userId,
            nickname: null,
            silverChip: 0,
            goldChip: 0,
            isPlaying: false,
            ownedCards: [],
            paytableLevels: {},
            paytableBaseChips: {},
            paytableMultipliers: {},
          };
      }),
    );
    return users;
  }

  /**
   * 게임 시작 로직 (handleReady와 handleNextRound에서 공통 사용)
   */
  private async startGameForRoom(roomId: string) {
    this.roomService.startGame(roomId);

    const userIds = this.getRoomUserIds(roomId);
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);

    if (!room) return;

    // 상대방 유저들의 전체 정보 가져오기
    // const allUserInfos = await this.getRoomUserInfos(roomId);
    // const const userIds = this.getRoomUserIds(roomId);

    for (const socketId of room) {
      const uid = this.socketIdToUserId.get(socketId);
      if (!uid) continue;

      const gameInfo = await this.roomService.createStartGameInfo(roomId, uid, userIds);

      this.emitUserResponseBySocketId(
        socketId,
        new StartGameResponseDto({
          round: gameInfo.round,
          totalDeckCards: gameInfo.totalDeckCards,
          silverSeedChip: gameInfo.silverSeedChip,
          goldSeedChip: gameInfo.goldSeedChip,
          silverTableChip: gameInfo.silverTableChip,
          goldTableChip: gameInfo.goldTableChip,
          userInfo: gameInfo.userInfo,
        }),
      );
    }
  }



  // === 연결 관리 ===

  handleConnection(client: Socket) {
    try {
      this.logger.log(
        `[handleConnection] WebSocket client connected: socketId=${client.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleConnection] Error handling WebSocket connection: socketId=${client.id}`,
        (error as Error).stack,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleDisconnect] WebSocket client disconnected: socketId=${client.id}, userId=${userId}`,
      );

      if (userId) {
        await this.authService.removeConnection(userId);
      }

      this.socketIdToUserId.delete(client.id);
      const joinedRoomIds = this.socketIdToRoomIds.get(client.id)
        ? Array.from(this.socketIdToRoomIds.get(client.id)!)
        : [];
      this.socketIdToRoomIds.delete(client.id);

      if (userId) {
        for (const roomId of joinedRoomIds) {
          // 연결이 끊어질 때도 칩 정보를 DB에 저장
          await this.roomService.saveUserChipsOnLeave(roomId, userId);

          await this.roomService.removeUserFromRoom(
            roomId,
            userId,
            this.socketIdToRoomIds,
            this.socketIdToUserId,
          );
        }

        this.logger.log(
          `[handleDisconnect] removeUserFromRoom called for userId=${userId} in rooms=${JSON.stringify(joinedRoomIds)}`,
        );

        for (const roomId of joinedRoomIds) {
          const users = await this.getRoomUserInfos(roomId);
          this.logger.log(
            `[handleDisconnect] roomUsers emit: roomId=${roomId}, users=${JSON.stringify(users)}`,
          );
          this.emitRoomResponse(roomId, new RoomUsersResponseDto({ users }));
        }
      } else {
        this.logger.warn(
          `[handleDisconnect] userId not found for socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[handleDisconnect] Error in handleDisconnect: socketId=${client.id}`,
        (error as Error).stack,
      );
    }
  }

  // === 방 관리 ===

  @SubscribeMessage(JoinRoomRequestDto.requestEventName)
  async handleJoinRoomRequest(
    @MessageBody() data: JoinRoomRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[handleJoinRoom] joinRoom: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

      await client.join(data.roomId);
      this.socketIdToUserId.set(client.id, data.userId);

      if (!this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.set(client.id, new Set());
      }
      this.socketIdToRoomIds.get(client.id)!.add(data.roomId);

      this.emitUserResponse(client, new JoinRoomResponseDto({}));

      const users = await this.getRoomUserInfos(data.roomId);
      this.logger.log(
        `[handleJoinRoom] roomUsers emit: users=${JSON.stringify(users)}`,
      );
      this.emitRoomResponse(data.roomId, new RoomUsersResponseDto({ users }));

      this.logger.log(
        `[handleJoinRoom] joinRoom SUCCESS: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleJoinRoom] Error in joinRoom: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to join room' }),
      );
    }
  }

  @SubscribeMessage(LeaveRoomRequestDto.requestEventName)
  async handleLeaveRoomRequest(
    @MessageBody() data: LeaveRoomRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleLeaveRoom] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleLeaveRoom] leaveRoom: socketId=${client.id}, userId=${userId}, roomId=${roomId}, payload=${JSON.stringify(data)}`,
      );

      // 유저가 playing 상태인지 확인
      if (userId && this.roomService.isUserPlaying(roomId, userId)) {
        this.logger.warn(
          `[handleLeaveRoom] 유저가 playing 상태에서 요청 무시: userId=${userId}, roomId=${roomId}`,
        );
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '게임 진행 중에는 방을 나갈 수 없습니다.' }),
        );
        return;
      }

      await client.leave(roomId);

      if (this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.get(client.id)!.delete(roomId);
        if (this.socketIdToRoomIds.get(client.id)!.size === 0) {
          this.socketIdToRoomIds.delete(client.id);
        }
      }

      if (userId) {
        // 방에서 퇴장할 때 칩 정보를 DB에 저장
        await this.roomService.saveUserChipsOnLeave(roomId, userId);

        this.emitUserResponse(client, new LeaveRoomResponseDto({}));
        await this.roomService.removeUserFromRoom(
          roomId,
          userId,
          this.socketIdToRoomIds,
          this.socketIdToUserId,
        );

        this.logger.log(
          `[handleLeaveRoom] leaveRoom SUCCESS: socketId=${client.id}, userId=${userId}, roomId=${roomId}`,
        );

        const users = await this.getRoomUserInfos(roomId);
        this.logger.log(
          `[handleLeaveRoom] roomUsers emit: roomId=${roomId}, users=${JSON.stringify(users)}`,
        );
        this.emitRoomResponse(
          roomId,
          new RoomUsersResponseDto({ users }),
        );
      } else {
        this.logger.warn(
          `[handleLeaveRoom] userId not found for socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[handleLeaveRoom] Error in leaveRoom: socketId=${client.id}`,
        (error as Error).stack,
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to leave room' }),
      );
    }
  }

  // === 게임 로직 ===

  @SubscribeMessage(StartGameRequestDto.requestEventName)
  async handleStartGameRequest(
    @MessageBody() data: StartGameRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.validateUserRegistration(client);
    if (!userId) return;

    // socketId로 roomId 찾기
    const roomIds = this.socketIdToRoomIds.get(client.id);
    if (!roomIds || roomIds.size === 0) {
      this.logger.warn(`[handleReady] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
      );
      return;
    }

    // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
    const roomId = Array.from(roomIds)[0];

    this.logger.log(
      `[handleReady] ready: socketId=${client.id}, userId=${userId}, roomId=${roomId}, payload=${JSON.stringify(data)}`,
    );

    if (!this.validateRoomPhase(roomId, 'waiting', userId)) return;

    this.roomService.setReady(roomId, userId);
    this.logger.log(
      `[handleReady] setReady 완료: userId=${userId}, roomId=${roomId}`,
    );

    if (this.roomService.canStart(roomId)) {
      this.logger.log(
        `[handleReady] 모든 유저 준비 완료, 게임 시작: roomId=${roomId}`,
      );
      await this.startGameForRoom(roomId);
    }
  }

  @SubscribeMessage(DiscardRequestDto.requestEventName)
  handleDiscardRequest(
    @MessageBody() data: DiscardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleDiscard] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      if (!this.validateRoomPhase(roomId, 'playing', userId)) return;

      // 버리기 횟수 체크 및 증가
      if (!this.roomService.canUserDiscard(roomId, userId)) {
        this.emitUserResponse(
          client,
          new DiscardResponseDto({
            success: false,
            message: '버리기는 라운드당 최대 4번만 가능합니다.',
          }),
        );
        return;
      }

      const { newHand, discarded, remainingDiscards } = this.roomService.discardAndDraw(
        roomId,
        userId,
        data.cards,
      );

      // 본인에게는 전체 정보 전송
      const res = new DiscardResponseDto({
        userId,
        discardCount: data.cards.length,
        newHand,
        discarded,
        remainingDiscards,
      });
      this.emitUserResponse(client, res);

      // 상대방에게는 discardCount만 전송
      const otherRes = new DiscardResponseDto({
        userId,
        discardCount: data.cards.length,
        remainingDiscards,
      });
      this.emitRoomResponseExceptUser(roomId, userId, otherRes);
    } catch (error) {
      this.logger.error(
        `[handleDiscard] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to discard cards' }),
      );
    }
  }

  @SubscribeMessage(HandPlayReadyRequestDto.requestEventName)
  async handleHandPlayReadyRequest(
    @MessageBody() data: HandPlayReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleHandPlayReady] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      if (!this.validateRoomPhase(roomId, 'playing', userId)) return;

      if (this.roomService.hasUserHandPlay(roomId, userId)) {
        this.logger.warn(
          `[handleHandPlayReady] 이미 제출된 유저의 중복 요청 무시: userId=${userId}, roomId=${roomId}`,
        );
        return;
      }

      this.roomService.handPlayReady(roomId, userId, data.playCards);
      this.logger.log(
        `[handleHandPlayReady] userId=${userId}, roomId=${roomId}, hand=${JSON.stringify(data.playCards)}`,
      );

      this.emitRoomResponse(
        roomId,
        new HandPlayReadyResponseDto({ userId }),
      );

      const userIds = this.getRoomUserIds(roomId);

      // playing 상태인 유저들만 필터링
      const playingUserIds = userIds.filter(uid => this.roomService.isUserPlaying(roomId, uid));

      if (this.roomService.canRevealHandPlay(roomId, userIds)) {
        try {
          const result = await this.roomService.processHandPlayResult(roomId, playingUserIds);

          const adapter = this.server.of('/').adapter;
          const room = adapter.rooms.get(roomId);

          if (room) {
            for (const socketId of room) {
              const uid = this.socketIdToUserId.get(socketId);
              if (!uid) continue;

              const res = new HandPlayResultResponseDto({
                roundResult: result.roundResult,
                shopCards: result.shopCards,
                round: result.round,
              });
              this.emitUserResponseBySocketId(socketId, res);
            }
          }
        } catch (error) {
          this.logger.error(`[handleHandPlayReady] Error processing hand play result: roomId=${roomId}`, error);
        }
      }
    } catch (error) {
      this.logger.error(
        `[handleHandPlayReady] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to submit hand play' }),
      );
    }
  }

  @SubscribeMessage(NextRoundReadyRequestDto.requestEventName)
  async handleNextRoundReadyRequest(
    @MessageBody() data: NextRoundReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleNextRound] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleNextRound] nextRound: socketId=${client.id}, userId=${userId}, roomId=${roomId}, payload=${JSON.stringify(data)}`,
      );

      this.roomService.setNextRoundReady(roomId, userId);
      this.logger.log(
        `[handleNextRound] nextRoundReady 완료: userId=${userId}, roomId=${roomId}`,
      );

      this.emitRoomResponse(
        roomId,
        new NextRoundReadyResponseDto({ userId }),
      );

      const userIds = this.getRoomUserIds(roomId);

      if (this.roomService.canStartNextRound(roomId, userIds)) {
        this.logger.log(
          `[handleNextRound] 모든 유저 nextRound 완료, 다음 라운드 시작: roomId=${roomId}`,
        );
        await this.startGameForRoom(roomId);
      }
    } catch (error) {
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to start next round' }),
      );
    }
  }

  // === 상점 관련 ===

  @SubscribeMessage(BuyCardRequestDto.requestEventName)
  async handleBuyCardRequest(
    @MessageBody() data: BuyCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      this.logger.log(
        `[handleBuyCard] buyCard: socketId=${client.id}, userId=${userId}, cardId=${data.cardId}`,
      );

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleBuyCard] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      if (!this.validateRoomPhase(roomId, 'shop', userId)) return;

      const result = await this.roomService.buyCard(
        roomId,
        userId,
        data.cardId,
      );

      if (result.success) {
        this.logger.log(
          `[handleBuyCard] 구매 성공: userId=${userId}, cardId=${data.cardId}`,
        );

        // 구매한 유저에게는 firstDeckCards와 planetCardIds 포함하여 응답
        const buyerResponse = new BuyCardResponseDto({
          success: true,
          userId: userId,
          cardId: data.cardId,
          funds: result.funds ?? 0,
          message: '카드 구매가 완료되었습니다.',
          firstDeckCards: result.firstDeckCards, // 수정된 덱의 앞 8장
          planetCardIds: result.planetCardIds, // tarot_10용 행성 카드 ID 리스트
        });
        this.emitUserResponse(client, buyerResponse);

        // 다른 유저들에게는 firstDeckCards와 planetCardIds 없이 응답
        const otherUsersResponse = new BuyCardResponseDto({
          success: true,
          userId: userId,
          cardId: data.cardId,
          funds: result.funds ?? 0,
          message: '카드 구매가 완료되었습니다.',
          planetCardIds: result.planetCardIds, // tarot_10용 행성 카드 ID 리스트
        });
        this.emitRoomResponseExceptUser(roomId, userId, otherUsersResponse);

      } else {
        this.logger.warn(
          `[handleBuyCard] 구매 실패: userId=${userId}, cardId=${data.cardId}, reason=${result.message}`,
        );

        const res = new BuyCardResponseDto({
          success: false,
          userId: userId,
          cardId: data.cardId,
          funds: result.funds ?? 0,
          message: result.message,
        });

        this.emitUserResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleBuyCard] Error in buyCard: socketId=${client.id}, cardId=${data.cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to buy card' }),
      );
    }
  }

  @SubscribeMessage(SellCardRequestDto.requestEventName)
  async handleSellCardRequest(
    @MessageBody() data: SellCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(
          `[handleSellCard] socketId=${client.id}가 어떤 방에도 속해있지 않습니다.`,
        );
        this.emitUserResponse(
          client,
          new SellCardResponseDto({
            success: false,
            message: '방에 속해있지 않습니다.',
          }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleSellCard] sellCard: socketId=${client.id}, userId=${userId}, roomId=${roomId}, cardId=${data.cardId}`,
      );

      const result = await this.roomService.sellCard(
        roomId,
        userId,
        data.cardId,
      );

      if (result.success) {
        this.logger.log(
          `[handleSellCard] 판매 성공: userId=${userId}, cardId=${data.cardId}`,
        );
        const res = new SellCardResponseDto({
          success: true,
          message: result.message,
          userId: userId,
          soldCardId: result.soldCardId,
          funds: result.funds ?? 0,
        });
        this.emitRoomResponse(roomId, res);
      } else {
        this.logger.warn(
          `[handleSellCard] 판매 실패: userId=${userId}, cardId=${data.cardId}, message=${result.message}`,
        );
        const res = new SellCardResponseDto({
          success: false,
          message: result.message,
          userId: userId,
          funds: result.funds ?? 0,
        });
        this.emitUserResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleSellCard] Error in sellCard: socketId=${client.id}, cardId=${data.cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      const res = new SellCardResponseDto({
        success: false,
        message: '판매 중 오류가 발생했습니다.',
      });
      this.emitUserResponse(client, res);
    }
  }

  @SubscribeMessage(ReRollShopRequestDto.requestEventName)
  async handleReRollShopRequest(
    @MessageBody() data: ReRollShopRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleReRollShop] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleReRollShop] reRollShop: socketId=${client.id}, userId=${userId}, roomId=${roomId}, payload=${JSON.stringify(data)}`,
      );

      // 유저의 funds 확인 (다시뽑기 가격: 5)
      const userChips = await this.roomService.getUserChips(roomId, userId);
      if (userChips.funds < 5) {
        this.logger.warn(
          `[handleReRollShop] 다시뽑기 실패 - funds 부족: userId=${userId}, funds=${userChips.funds}, required=5`,
        );
        const res = new ReRollShopResponseDto({
          success: false,
          message: '다시뽑기에는 5 funds가 필요합니다.',
          cards: [],
        });
        this.emitUserResponse(client, res);
        return;
      }

      const reRollCards = this.roomService.getReRollCards(roomId, userId);

      // 다시뽑기 성공 시 funds에서 5 차감
      const success = await this.roomService.updateUserFunds(roomId, userId, -5);
      if (!success) {
        this.logger.warn(
          `[handleReRollShop] funds 차감 실패: userId=${userId}, roomId=${roomId}`,
        );
        const res = new ReRollShopResponseDto({
          success: false,
          message: '다시뽑기 중 오류가 발생했습니다.',
          cards: [],
        });
        this.emitUserResponse(client, res);
        return;
      }

      // 차감 후 남은 funds 가져오기
      const updatedUserChips = await this.roomService.getUserChips(roomId, userId);

      this.logger.log(
        `[handleReRollShop] 다시뽑기 성공: userId=${userId}, roomId=${roomId}, cards=${JSON.stringify(reRollCards)}, remainingFunds=${updatedUserChips.funds}`,
      );

      // 요청한 유저에게는 카드 정보를 포함한 응답 전송
      const userRes = new ReRollShopResponseDto({
        success: true,
        cards: reRollCards,
        userId: userId,
        funds: updatedUserChips.funds,
      });
      this.emitUserResponse(client, userRes);

      // 다른 유저들에게는 funds 업데이트만 전송
      const otherUsersRes = new ReRollShopResponseDto({
        success: true,
        cards: [], // 빈 배열
        userId: userId,
        funds: updatedUserChips.funds,
      });
      this.emitRoomResponseExceptUser(roomId, userId, otherUsersRes);
    } catch (error) {
      this.logger.error(
        `[handleReRollShop] Error in reRollShop: socketId=${client.id}`,
        (error as Error).stack,
      );
      const res = new ReRollShopResponseDto({
        success: false,
        message: '다시뽑기 중 오류가 발생했습니다.',
        cards: [],
      });
      this.emitUserResponse(client, res);
    }
  }

  @SubscribeMessage(ReorderJokersRequestDto.requestEventName)
  async handleReorderJokersRequest(
    @MessageBody() data: ReorderJokersRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(
          `[handleReorderJokers] socketId=${client.id}가 어떤 방에도 속해있지 않습니다.`,
        );
        this.emitUserResponse(
          client,
          new ReorderJokersResponseDto({
            success: false,
            message: '방에 속해있지 않습니다.',
            userId: userId,
            jokerIds: [],
          }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleReorderJokers] reorderJokers: socketId=${client.id}, userId=${userId}, roomId=${roomId}, jokerIds=${JSON.stringify(data.jokerIds)}`,
      );

      const result = await this.roomService.reorderJokers(
        roomId,
        userId,
        data.jokerIds,
      );

      if (result.success) {
        this.logger.log(
          `[handleReorderJokers] 순서 변경 성공: userId=${userId}, jokerIds=${JSON.stringify(result.jokerIds)}`,
        );

        // 성공 시 모든 유저에게 알림
        const res = new ReorderJokersResponseDto({
          userId: result.userId!,
          jokerIds: result.jokerIds!,
        });
        this.emitRoomResponse(roomId, res);
      } else {
        this.logger.warn(
          `[handleReorderJokers] 순서 변경 실패: userId=${userId}, message=${result.message}`,
        );

        // 실패 시 요청한 유저에게만 알림
        const res = new ReorderJokersResponseDto({
          success: false,
          message: result.message,
          userId: userId,
          jokerIds: [],
        });
        this.emitUserResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleReorderJokers] Error in reorderJokers: socketId=${client.id}, jokerIds=${JSON.stringify(data.jokerIds)}`,
        error instanceof Error ? error.stack : String(error),
      );
      const userId = this.socketIdToUserId.get(client.id) || '';
      const res = new ReorderJokersResponseDto({
        success: false,
        message: '순서 변경 중 오류가 발생했습니다.',
        userId: userId,
        jokerIds: [],
      });
      this.emitUserResponse(client, res);
    }
  }

  // === 베팅 ===

  @SubscribeMessage(BettingRequestDto.requestEventName)
  async handleBettingRequest(
    @MessageBody() data: BettingRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      // socketId로 roomId 찾기
      const roomIds = this.socketIdToRoomIds.get(client.id);
      if (!roomIds || roomIds.size === 0) {
        this.logger.warn(`[handleBetting] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: '방을 찾을 수 없습니다.' }),
        );
        return;
      }

      // 첫 번째 방 사용 (일반적으로 한 유저는 하나의 방에만 속함)
      const roomId = Array.from(roomIds)[0];

      this.logger.log(
        `[handleBetting] betting: socketId=${client.id}, userId=${userId}, roomId=${roomId}, payload=${JSON.stringify(data)}`,
      );

      const result = await this.roomService.handleBetting(roomId, userId);

      if (result.success) {
        this.logger.log(
          `[handleBetting] 베팅 성공: userId=${userId}, currentSilverSeed=${result.currentSilverSeed}, currentGoldSeed=${result.currentGoldSeed}`,
        );

        // 성공 시 모든 유저에게 알림
        const res = new BettingResponseDto({
          userId: userId,
          currentSilverSeed: result.currentSilverSeed!,
          currentGoldSeed: result.currentGoldSeed!,
        });
        this.emitRoomResponse(roomId, res);
      } else {
        this.logger.warn(
          `[handleBetting] 베팅 실패: userId=${userId}, message=${result.message}`,
        );

        // 실패 시 요청한 유저에게만 알림
        const res = new BettingResponseDto({
          success: false,
          message: result.message,
          userId: userId,
          currentSilverSeed: 0,
          currentGoldSeed: 0,
        });
        this.emitUserResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleBetting] Error in betting: socketId=${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      const userId = this.socketIdToUserId.get(client.id) || '';
      const res = new BettingResponseDto({
        success: false,
        message: '베팅 중 오류가 발생했습니다.',
        userId: userId,
        currentSilverSeed: 0,
        currentGoldSeed: 0,
      });
      this.emitUserResponse(client, res);
    }
  }

  // === 특별 카드 사용 ===

  @SubscribeMessage('UseSpecialCardRequest')
  async handleUseSpecialCardRequest(
    @MessageBody() data: UseSpecialCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.validateUserRegistration(client);
    if (!userId) {
      this.emitUserResponse(client, new ErrorResponseDto({
        success: false,
        message: '사용자 인증이 필요합니다.',
      }));
      return;
    }

    const roomId = this.socketIdToRoomIds.get(client.id)?.values().next().value;
    if (!roomId) {
      this.emitUserResponse(client, new ErrorResponseDto({
        success: false,
        message: '방에 입장되어 있지 않습니다.',
      }));
      return;
    }

    this.logger.log(`[handleUseSpecialCardRequest] userId=${userId}, roomId=${roomId}, cardId=${data.cardId}, cards=${JSON.stringify(data.cards)}`);

    // Service에서 특별 카드 사용 처리
    const result = await this.roomService.processUseSpecialCard(roomId, userId, data.cardId, data.cards);

    // 요청한 유저에게는 카드 정보 포함하여 응답
    const requesterResponse = new UseSpecialCardResponseDto({
      success: result.success,
      message: result.message,
      userId: userId,
      cardId: data.cardId,
      selectedCards: result.selectedCards,
      resultCards: result.resultCards
    });
    this.emitUserResponse(client, requesterResponse);

    // 다른 유저들에게는 카드 정보 없이 응답
    const otherUsersResponse = new UseSpecialCardResponseDto({
      success: result.success,
      message: result.message,
      userId: userId,
      cardId: data.cardId,
      // selectedCards와 resultCards 제외
    });
    this.emitRoomResponseExceptUser(roomId, userId, otherUsersResponse);
  }

  // === 인증 ===

  @SubscribeMessage(LoginRequestDto.requestEventName)
  async handleLoginRequest(
    @MessageBody() data: LoginRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[handleLogin] login attempt: socketId=${client.id}, email=${data.email}, clientVersion=${data.version}`,
      );

      // 버전 체크
      this.logger.log(`[handleLogin] Version check: client=${getVersionString(data.version)}, minRequired=${getVersionString(MIN_CLIENT_VERSION)}`);
      if (!isClientVersionSupported(data.version)) {
        this.logger.warn(
          `[handleLogin] Unsupported client version: ${getVersionString(data.version)}, socketId=${client.id}`,
        );
        const res = new LoginResponseDto({
          success: false,
          code: 1003,
          message: `Unsupported client version. Please update to version ${getVersionString(MIN_CLIENT_VERSION)} or higher.`,
        });
        this.emitUserResponse(client, res);
        return;
      }

      const user = await this.authService.validateUser(
        data.email,
        data.password,
      );
      if (!user) {
        const res = new LoginResponseDto({
          success: false,
          code: 1001,
          message: 'Invalid credentials',
        });
        this.emitUserResponse(client, res);
        return;
      }

      const connectionResult =
        await this.authService.checkAndRegisterConnection(user.email);
      if (!connectionResult.isNewConnection) {
        const res = new LoginResponseDto({
          success: false,
          code: 1002,
          message: connectionResult.message,
        });
        this.emitUserResponse(client, res);
        return;
      }

      this.socketIdToUserId.set(client.id, user.email);

      // 로그인할 때마다 DB에서 스페셜카드 데이터 다시 읽어들이기
      await this.specialCardManagerService.initializeCards(this.roomService['prisma']);

      // 활성화된 스페셜카드 데이터 가져오기
      const activeSpecialCards = this.specialCardManagerService.getActiveSpecialCards();

      // 로그 추가: price 필드 확인
      if (activeSpecialCards.length > 0) {
        this.logger.log(`[handleLogin] 첫 번째 카드 price 확인: ${activeSpecialCards[0].id} = ${activeSpecialCards[0].price}`);
      }

      // 게임 설정 가져오기
      const gameSettings = await this.gameSettingsService.getGameSettings();

      const res = new LoginResponseDto({
        success: true,
        code: 0,
        message: 'Login successful',
        email: user.email,
        nickname: user.nickname,
        silverChip: user.silverChip,
        goldChip: user.goldChip,
        createdAt: user.createdAt.toISOString(),
        specialCards: activeSpecialCards,
        gameSettings: gameSettings
      });
      this.emitUserResponse(client, res);

      this.logger.log(
        `[handleLogin] login success: socketId=${client.id}, email=${user.email}`,
      );
    } catch (error) {
      const res = new LoginResponseDto({
        success: false,
        code: 1000,
        message: 'Internal server error',
      });
      this.emitUserResponse(client, res);
    }
  }

  onModuleInit() {
    (
      global as unknown as { roomGatewayInstance: unknown }
    ).roomGatewayInstance = this;
    this.logger.log('[RoomGateway] 글로벌 인스턴스 등록 완료');
  }
}
