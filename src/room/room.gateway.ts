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
import { RoomService, ChipType } from './room.service';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
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
import { ShopResponseDto } from './socket-dto/shop-response.dto';
import { JoinRoomResponseDto } from './socket-dto/join-room-response.dto';
import { LeaveRoomResponseDto } from './socket-dto/leave-room-response.dto';
import { RoomUsersResponseDto, RoomUser } from './socket-dto/room-users-response.dto';
import { StartGameResultDto } from './socket-dto/start-game-result.dto';
import { HandPlayReadyResponseDto } from './socket-dto/hand-play-ready-response.dto';
import { NextRoundReadyResponseDto } from './socket-dto/next-round-ready-response.dto';
import { ErrorResponseDto } from './socket-dto/error-response.dto';
import { StartGameRequestDto } from './socket-dto/start-game-request.dto';
import { BettingRequestDto } from './socket-dto/betting-request.dto';
import { BettingResponseDto } from './socket-dto/betting-response.dto';
import { BettingResultDto } from './socket-dto/betting-result.dto';
import { UseSpecialCardRequestDto } from './socket-dto/use-special-card-request.dto';
import { UseSpecialCardResponseDto } from './socket-dto/use-special-card-response.dto';
import { LastPlayerWinResponseDto } from './socket-dto/last-player-win-response.dto';
import { KickOutRequestDto } from './socket-dto/kick-out-request.dto';
import { KickOutResponseDto } from './socket-dto/kick-out-response.dto';
import { SpecialCardManagerService } from './special-card-manager.service';
import { isClientVersionSupported, MIN_CLIENT_VERSION, getVersionString } from '../common/constants/version.constants';
import { DevToolsService } from '../dev-tools/dev-tools.service';
import { GameSettingsService } from '../common/services/game-settings.service';
import { TranslationKeys } from '../common/translation-keys.enum';
import { LocalizationService } from '../common/services/localization.service';
import { RoomPhase } from './room-phase.enum';
import { StartGameResponseDto } from './socket-dto/start-game-response.dto';


interface SocketSession {
  userId: string;
  roomId: string | null;
  language: string;
}

@WebSocketGateway({
  cors: true,
  // pingInterval: 25000,
  // pingTimeout: 20000,
  // pingInterval: 60000 * 5 + 5000,
  // pingTimeout: 60000 * 5,
  pingInterval: 60000 * 1 + 5000,
  pingTimeout: 60000 * 1,
  transports: ['websocket']
  // transports: ['polling']
})

export class RoomGateway
  implements
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnModuleInit,
  OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomGateway.name);

  private socketSessions: Map<string, SocketSession> = new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly specialCardManagerService: SpecialCardManagerService,
    private readonly devToolsService: DevToolsService,
    private readonly gameSettingsService: GameSettingsService,
    private readonly localizationService: LocalizationService,
    private readonly jwtService: JwtService,
  ) { }


  afterInit(server: any) {
    this.logger.log('WebSocket server initialized');
  }

  // === 유틸리티 메서드들 ===

  /**
   * 사용자 언어 설정을 가져옵니다.
   */
  private getUserLanguage(client: Socket): string {
    return this.socketSessions.get(client.id)?.language || 'en';
  }

  /**
   * 사용자 ID를 가져옵니다.
   */
  private getUserId(socketId: string): string | null {
    return this.socketSessions.get(socketId)?.userId || null;
  }

  /**
   * 사용자 방 ID를 가져옵니다.
   */
  private getUserRoomId(socketId: string): string | null {
    return this.socketSessions.get(socketId)?.roomId || null;
  }

  /**
   * 사용자 ID로 소켓을 찾습니다.
   */
  private findSocketByUserId(userId: string): Socket | null {
    for (const [socketId, session] of this.socketSessions.entries()) {
      if (session.userId === userId) {
        return this.server.sockets.sockets.get(socketId) || null;
      }
    }
    return null;
  }

  /**
   * 사용자를 방에서 제거합니다.
   */
  private async removeUserFromRoom(roomId: string, userId: string, socket: Socket, isKickOut: boolean = false): Promise<void> {

    // 중요!!! 제일 먼저 클리어 해주어야 된다..밑에 await 문이 있으면 다른 곳에서 호출 될수 있어서 문제 생긴다
    const session = this.socketSessions.get(socket.id);
    if (session) {
      session.roomId = null;
    }

    let remainingUserCount = 0;
    for (const session of this.socketSessions.values()) {
      if (session.roomId === roomId) {
        remainingUserCount++;
        if (remainingUserCount > 1) break; // 2명 이상이면 더 이상 체크할 필요 없음
      }
    }

    const saveResult = await this.roomService.saveUserChipsOnLeave(roomId, userId);
    this.emitUserResponse(socket, new LeaveRoomResponseDto({
      silverChip: saveResult.silverChip,
      goldChip: saveResult.goldChip,
      isKickOuted: isKickOut
    }));

    await socket.leave(roomId);
    await this.roomService.leaveRoom(roomId, userId);

    if (remainingUserCount === 0) {
      // 방에 유저가 없으면 방 삭제
      this.roomService.deleteRoom(roomId);
    }
    else {
      const roomUsersResponse = await this.createRoomUsersResponseDto(roomId);
      this.emitRoomResponse(roomId, roomUsersResponse);

      // 마지막 플레이어 승리 처리
      const lastPlayerWinResult = await this.roomService.handleLastPlayerWin(roomId);
      if (lastPlayerWinResult.success && lastPlayerWinResult.lastWinnerId) {
        // 마지막 플레이어 승리인 경우 별도 응답 전송
        this.emitRoomResponse(
          roomId,
          new LastPlayerWinResponseDto({
            lastWinnerId: lastPlayerWinResult.lastWinnerId,
            chipsGain: lastPlayerWinResult.chipsGain || 0,
            originalChipsGain: lastPlayerWinResult.originalChipsGain || 0,
            finalChips: lastPlayerWinResult.finalChips || 0,
          })
        );
      }

    }
  }

  /**
   * 특정 유저를 방에서 제거하고 세션을 관리합니다.
   */
  // private removeUserFromRoomSession(roomId: string, userId: string): void {
  //   // 해당 유저의 세션에서 방 제거
  //   for (const [socketId, session] of this.socketSessions.entries()) {
  //     if (session.userId === userId && session.roomId === roomId) {
  //       session.roomId = null;
  //       break; // 유저는 1개 방에만 있으므로 찾으면 종료
  //     }
  //   }

  //   // 방에 남은 유저가 있는지 체크 (최적화)
  //   let remainingUserCount = 0;
  //   for (const session of this.socketSessions.values()) {
  //     if (session.roomId === roomId) {
  //       remainingUserCount++;
  //       if (remainingUserCount > 1) break; // 2명 이상이면 더 이상 체크할 필요 없음
  //     }
  //   }

  //   if (remainingUserCount === 0) {
  //     // 방에 유저가 없으면 방 삭제
  //     this.roomService.deleteRoom(roomId);
  //   }
  // }

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
   * 게임에 참여 중인 유저에게만 메시지를 전송하는 메서드
   */
  private emitRoomResponseToPlayingUsers(roomId: string, response: any): void {
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);

    if (room) {
      for (const socketId of room) {
        const userId = this.getUserId(socketId);
        if (!userId) continue;

        // 게임에 참여 중인 유저인지 확인
        const userStatus = this.roomService.getUserStatus(roomId, userId);
        if (userStatus === 'playing') {
          this.emitUserResponseBySocketId(socketId, response);
        }
      }
    }
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
        const userId = this.getUserId(socketId);
        if (userId && userId !== excludeUserId) {
          this.emitUserResponseBySocketId(socketId, res);
        }
      }
    }
  }

  // /**
  //  * userId로 socketId를 찾는 메서드
  //  */
  // private getSocketIdByUserId(userId: string): string | null {
  //   for (const [socketId, session] of this.socketSessions.entries()) {
  //     if (session.userId === userId) {
  //       return socketId;
  //     }
  //   }
  //   return null;
  // }

  // /**
  //  * userId로 응답을 전송하는 메서드
  //  */
  // private emitUserResponseByUserId(userId: string, response: BaseSocketDto): void {
  //   const socketId = this.getSocketIdByUserId(userId);
  //   if (socketId) {
  //     this.emitUserResponseBySocketId(socketId, response);
  //   } else {
  //     this.logger.warn(`[emitUserResponseByUserId] socketId not found for userId=${userId}`);
  //   }
  // }

  /**
   * HandPlayResult를 시작하는 메서드
   */
  private async startHandPlayResult(roomId: string): Promise<void> {
    try {
      const roomState = this.roomService.getRoomState(roomId);

      const chipType = roomState.chipSettings.chipType;

      // 5라운드 끝인 경우 베팅 라운드 시작 (GOLD 방만)
      if (roomState.round === 5 && chipType === ChipType.GOLD) {

        this.roomService.startBettingRound(roomId);
        const bettingResponse = await this.roomService.createBettingResponse(roomId, true); // isFirst: true
        this.emitRoomResponse(roomId, new BettingResponseDto(bettingResponse));
        return;
      }

      // 1-4라운드: 기존 로직
      const playingUserIds = this.roomService.getPlayingUserIds(roomId, this.getRoomUserIds(roomId));
      const result = await this.roomService.processHandPlayResult(roomId, playingUserIds);

      // SILVER 방 보상 계산
      let chipReward = 0;
      let targetScore = 100;
      if (chipType === ChipType.SILVER && roomState.round === 5) {
        const totalScore = roomState.silverTotalScore;
        chipReward = 100;
        if (totalScore < targetScore) {
          chipReward = Math.floor(chipReward * (totalScore / targetScore));
        }

        // SILVER 방에서 chipReward가 계산되면 유저 칩 업데이트
        if (chipReward > 0) {
          const userId = playingUserIds[0]; // 1인용 게임이므로 첫 번째 유저
          await this.roomService.updateUserChips(roomId, userId, chipReward);

          // roundResult의 finalChip 업데이트
          if (result.roundResult[userId]) {
            result.roundResult[userId].finalChips += chipReward;
            result.roundResult[userId].chipsGain = chipReward;
          }
        }
      }

      const handPlayRes = new HandPlayResultResponseDto({
        roundResult: result.roundResult,
        round: roomState.round,
        silverReward: chipType === ChipType.SILVER ? chipReward : undefined,
        silverTotalScore: chipType === ChipType.SILVER ? roomState.silverTotalScore : undefined,
        silverTargetScore: chipType === ChipType.SILVER ? targetScore : undefined
      });

      // 4라운드 끝: 베팅 라운드 시작 (GOLD 방만)
      if (roomState.round === 4 && chipType === ChipType.GOLD) {
        this.roomService.startBettingRound(roomId);
        const bettingResponse = await this.roomService.createBettingResponse(roomId, true); // isFirst: true

        this.emitRoomResponse(roomId, handPlayRes);
        this.emitRoomResponse(roomId, new BettingResponseDto(bettingResponse));
      }
      else {
        this.emitRoomResponse(roomId, handPlayRes);
        if (roomState.round !== 5 || chipType === ChipType.GOLD) {
          await this.sendShopResponse(roomId);
        }
        else {
          await this.roomService.handleGameEnd(roomId);
        }
      }

    } catch (error) {
      this.logger.error(`[startHandPlayResult] Error: roomId=${roomId}`, error);
    }
  }

  /**
   * 5라운드 베팅 완료 후 HandPlayResultResponse를 전송하는 메서드
   */
  private async processHandPlayResultAfterBetting(roomId: string): Promise<void> {
    try {
      const playingUserIds = this.roomService.getPlayingUserIds(roomId, this.getRoomUserIds(roomId));
      const result = await this.roomService.processHandPlayResult(roomId, playingUserIds);

      const handPlayRes = new HandPlayResultResponseDto({
        roundResult: result.roundResult,
        round: this.roomService.getRound(roomId)
      });

      this.emitRoomResponse(roomId, handPlayRes);
      await this.roomService.handleGameEnd(roomId);
    } catch (error) {
      this.logger.error(`[processHandPlayResultAfterBetting] Error: roomId=${roomId}`, error);
    }
  }

  /**
   * ShopResponse를 전송하는 메서드
   */
  private async sendShopResponse(roomId: string): Promise<void> {
    try {
      this.roomService.setRoomPhase(roomId, RoomPhase.SHOP);

      const shopCardIds = this.roomService.getShopCards(roomId);
      const roomState = this.roomService.getRoomState(roomId);
      let chipsRound = this.roomService.getRoundChips(roomId, true);
      let chipsTable = this.roomService.getTableChips(roomId) - chipsRound;

      if (roomState.round === 4) {
        chipsTable = 0;
        chipsRound = this.roomService.getTableChips(roomId);
      }

      const shopRes = new ShopResponseDto({
        shopCardIds: shopCardIds,
        round: roomState.round,
        chipsTable: chipsTable,
        chipsRound: chipsRound,
      });

      // 게임에 참여 중인 유저에게만 ShopResponse 전송
      this.emitRoomResponseToPlayingUsers(roomId, shopRes);
    } catch (error) {
      this.logger.error(`[sendShopResponse] Error: roomId=${roomId}`, error);
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
        const userId = this.getUserId(socketId);
        if (userId) userIds.push(userId);
      }
    }

    return userIds;
  }

  /**
   * 방 상태 검증
   */
  private validateRoomPhase(roomId: string, expectedPhase: RoomPhase, userId: string): boolean {
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
    const userId = this.getUserId(client.id);
    if (!userId) {
      this.logger.warn(`userId not found for socketId=${client.id}`);
      this.emitUserResponse(
        client,
        new ErrorResponseDto({
          message: this.localizationService.getText(TranslationKeys.UserNotFound, this.getUserLanguage(client))
        }),
      );
      return null;
    }
    return userId;
  }

  /**
   * RoomUsersResponseDto를 생성하는 헬퍼 함수
   */
  private async createRoomUsersResponseDto(roomId: string): Promise<RoomUsersResponseDto> {
    const users = await this.getRoomUserInfos(roomId);
    const currentPhase = this.roomService.getRoomPhase(roomId);
    const round = this.roomService.getRound(roomId);
    const seedAmount = this.roomService.getSeedChip(roomId);
    const chipsTable = this.roomService.getTableChips(roomId);
    const chipsRound = this.roomService.getRoundChips(roomId, false);

    return new RoomUsersResponseDto({
      users,
      currentPhase,
      round,
      seedAmount,
      // bettingAmount,
      chipsTable,
      chipsRound
    });
  }

  /**
   * 현재 방에 접속 중인 유저들의 정보를 반환
   */
  private async getRoomUserInfos(roomId: string): Promise<RoomUser[]> {
    const userIds = this.getRoomUserIds(roomId);

    // RoomService에서 유저 정보 가져오기
    const roomUserInfos = await this.roomService.getRoomUserInfos(roomId, userIds);

    // 방장 아이디 가져오기
    const roomOwnerId = this.roomService.getRoomOwner(roomId);

    const users = userIds.map((userId) => {
      const roomUserInfo = roomUserInfos[userId];

      return {
        userId: userId,
        nickname: roomUserInfo.nickname,
        chips: roomUserInfo?.chips || 0,
        funds: roomUserInfo?.funds || 0,
        isPlaying: roomUserInfo?.isPlaying || false,
        isRoomOwner: roomOwnerId === userId,  // 방장 여부
        ownedCards: roomUserInfo?.ownedCards || [],
        paytableLevels: roomUserInfo?.paytableLevels || {},
        paytableBaseChips: roomUserInfo?.paytableBaseChips || {},
        paytableMultipliers: roomUserInfo?.paytableMultipliers || {},
        cardEnhancements: roomUserInfo?.cardEnhancements || {},
      };
    });

    return users;
  }

  /**
   * 게임 시작 로직 (handleReady와 handleNextRound에서 공통 사용)
   */
  private async startGameForRoom(roomId: string) {
    await this.roomService.startGame(roomId);

    const userIds = this.getRoomUserIds(roomId);
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);

    if (!room) return;

    for (const socketId of room) {
      const uid = this.getUserId(socketId);
      if (!uid) continue;

      const gameInfo = await this.roomService.createStartGameInfo(roomId, uid, userIds);

      this.emitUserResponseBySocketId(
        socketId,
        new StartGameResultDto({
          round: gameInfo.round,
          totalDeckCards: gameInfo.totalDeckCards,
          seedAmount: gameInfo.seedAmount,
          chipsTable: gameInfo.chipsTable,
          chipsRound: gameInfo.chipsRound,
          userInfo: gameInfo.userInfo,
        }),
      );
    }
  }



  // === 연결 관리 ===

  async handleConnection(client: Socket) {
    try {
      this.logger.log(
        `[handleConnection] WebSocket client connected: socketId=${client.id}`,
      );

      // JWT 토큰에서 유저 정보 추출
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.warn(`[handleConnection] No token provided: socketId=${client.id}`);
        return;
      }

      try {
        // JWT 토큰 검증 및 디코딩
        const decoded = this.jwtService.verify(token);
        const userId = decoded.userId;

        // 중복 접속 체크
        const connectionResult = await this.authService.checkAndRegisterConnection(userId);
        if (!connectionResult.isNewConnection) {
          this.logger.warn(
            `[handleConnection] User already connected: socketId=${client.id}, userId=${userId}`,
          );
          client.disconnect();
          return;
        }

        // 세션 생성
        this.socketSessions.set(client.id, {
          userId: userId,
          roomId: null,
          language: decoded.language || 'en'
        });

        // 로그인할 때마다 DB에서 스페셜카드 데이터 다시 읽어들이기
        await this.specialCardManagerService.initializeCards(this.roomService['prisma']);

      } catch (jwtError) {
        this.logger.error(
          `[handleConnection] JWT verification failed: socketId=${client.id}`,
          jwtError,
        );
        client.disconnect();
        return;
      }

    } catch (error) {
      this.logger.error(
        `[handleConnection] Error handling WebSocket connection: socketId=${client.id}`,
        (error as Error).stack,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const session = this.socketSessions.get(client.id);
      const userId = session?.userId;
      const roomId = session?.roomId;

      if (userId) {
        await this.authService.removeRedisChannelMember(userId);

        if (roomId) {
          this.removeUserFromRoom(roomId, userId, client);
        }
      }

      this.socketSessions.delete(client.id);

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
    console.log(`[handleJoinRoomRequest] data: ${JSON.stringify(data)}`);
    try {
      // 소켓 세션에서 userId 조회
      const userId = this.getUserId(client.id);
      if (!userId) {
        this.logger.warn(`[handleJoinRoom] userId not found for socketId=${client.id}`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({
            message: this.localizationService.getText(TranslationKeys.UserNotFound, this.getUserLanguage(client))
          }),
        );
        return;
      }

      try {
        // RoomService를 통해 방에 입장 (Redis players 값 업데이트)
        const joinResult = await this.roomService.joinRoom(data.roomId, userId);

        // 🆕 입장 결과 확인
        if (!joinResult.success) {
          this.logger.warn(`[handleJoinRoom] Room entry failed: ${joinResult.message}`);
          this.emitUserResponse(
            client,
            new JoinRoomResponseDto({
              success: false,
              message: this.localizationService.getText(TranslationKeys.InsufficientChipsForRoomEntry, this.getUserLanguage(client))
            }),
          );
          return;
        }

        // 성공했을 때만 Socket.IO 방 참가 및 세션 업데이트
        await client.join(data.roomId);

        // 세션 업데이트 (userId는 이미 있으므로 roomId만 업데이트)
        const session = this.socketSessions.get(client.id);
        if (session) {
          session.roomId = data.roomId;
        }

        this.emitUserResponse(client, new JoinRoomResponseDto({
          success: true,
          chipType: joinResult.chipType || ChipType.SILVER,
          timeLimit: joinResult.timeLimit || 0
        }));
      } catch (error) {
        // RoomService 입장 실패 시 에러 응답
        this.logger.error(
          `[handleJoinRoom] RoomService joinRoom failed: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
          (error as Error).stack,
        );
        this.emitUserResponse(
          client,
          new JoinRoomResponseDto({
            success: false,
            message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
          }),
        );
        return;
      }

      const roomUsersResponse = await this.createRoomUsersResponseDto(data.roomId);

      this.emitRoomResponse(data.roomId, roomUsersResponse);

    } catch (error) {
      const userId = this.getUserId(client.id);
      this.logger.error(
        `[handleJoinRoom] Error in joinRoom: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({
          message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
        }),
      );
    }
  }

  @SubscribeMessage(LeaveRoomRequestDto.requestEventName)
  async handleLeaveRoomRequest(
    @MessageBody() data: LeaveRoomRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = this.socketSessions.get(client.id);
      const userId = session?.userId;
      const roomId = session?.roomId;

      if (!roomId) {
        this.logger.warn(`[handleLeaveRoom] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({
            message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
          }),
        );
        return;
      }

      // 유저가 playing 상태인지 확인
      if (userId !== 'hundrill') { // 테스트용
        if (userId && this.roomService.isUserPlaying(roomId, userId)) {
          // silver 방일 때는 playing 상태에서도 퇴장 허용
          const roomState = this.roomService.getRoomState(roomId);
          const chipType = roomState.chipSettings.chipType;

          if (chipType === ChipType.GOLD) {
            this.emitUserResponse(
              client,
              new ErrorResponseDto({
                message: this.localizationService.getText(TranslationKeys.GameInProgress, this.getUserLanguage(client))
              }),
            );
            return;
          }
        }
      }

      if (userId) {
        await this.removeUserFromRoom(roomId, userId, client);
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
        new ErrorResponseDto({
          message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
        }),
      );
    }
  }

  @SubscribeMessage(KickOutRequestDto.requestEventName)
  async handleKickOutRequest(
    @MessageBody() data: KickOutRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.validateUserRegistration(client);
    if (!userId) return;

    const roomId = this.getUserRoomId(client.id);
    if (!roomId) {
      this.logger.warn(`[handleKickOutRequest] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
      this.emitUserResponse(
        client,
        new ErrorResponseDto({
          message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
        }),
      );
      return;
    }

    try {

      // 방장 권한 확인
      const roomOwnerId = this.roomService.getRoomOwner(roomId);
      if (roomOwnerId !== userId) {
        this.logger.warn(
          `[handleKickOutRequest] 방장이 아닌 유저의 킥아웃 요청: userId=${userId}, roomOwnerId=${roomOwnerId}, roomId=${roomId}`,
        );
        this.emitUserResponse(
          client,
          new KickOutResponseDto({
            success: false,
            message: this.localizationService.getText(TranslationKeys.UnauthorizedAction, this.getUserLanguage(client))
          }),
        );
        return;
      }

      // 게임 상태 확인
      const roomPhase = this.roomService.getRoomPhase(roomId);

      // 자기 자신을 킥아웃하려는 경우
      if (data.userId === userId) {
        this.logger.warn(
          `[handleKickOutRequest] 자기 자신을 킥아웃하려는 시도: userId=${userId}, roomId=${roomId}`,
        );
        this.emitUserResponse(
          client,
          new KickOutResponseDto({
            success: false,
            message: this.localizationService.getText(TranslationKeys.CannotKickSelf, this.getUserLanguage(client))
          }),
        );
        return;
      }

      // 대상 유저가 방에 있는지 확인
      const roomUserIds = this.getRoomUserIds(roomId);
      if (!roomUserIds.includes(data.userId)) {
        this.logger.warn(
          `[handleKickOutRequest] 대상 유저가 방에 없음: userId=${userId}, targetUserId=${data.userId}, roomId=${roomId}`,
        );
        this.emitUserResponse(
          client,
          new KickOutResponseDto({
            success: false,
            message: this.localizationService.getText(TranslationKeys.UserNotInRoom, this.getUserLanguage(client))
          }),
        );
        return;
      }

      const targetSocket = this.findSocketByUserId(data.userId);

      if (targetSocket) {
        if (roomPhase === RoomPhase.WAITING) {
          await this.removeUserFromRoom(roomId, data.userId, targetSocket, true);
          this.emitUserResponse(
            client,
            new KickOutResponseDto({
              kickOutUserId: data.userId,
              isReserved: false
            }),
          );
        }
      }

    } catch (error) {
      this.emitUserResponse(
        client,
        new KickOutResponseDto({
          kickOutUserId: data.userId,
          isReserved: false
        }),
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
    const roomId = this.getUserRoomId(client.id);
    if (!roomId) {
      this.logger.warn(`[handleReady] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
      this.emitUserResponse(
        client,
        new ErrorResponseDto({
          message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
        }),
      );
      return;
    }

    if (!this.validateRoomPhase(roomId, RoomPhase.WAITING, userId))
      return;

    const roomState = this.roomService.getRoomState(roomId);
    const chipType = roomState.chipSettings.chipType;
    if (userId !== 'hundrill') { // 테스트용
      if (this.getRoomUserIds(roomId).length < 2 && chipType === ChipType.GOLD) {
        this.logger.warn(`[canStart] roomId=${roomId}에 유저가 2명 미만임`);
        return;
      }
    }

    const setReadyResult = await this.roomService.setReady(roomId, userId);

    this.emitRoomResponse(roomId, setReadyResult);

    if (await this.roomService.canStart(roomId)) {

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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleDiscard] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({
            message: this.localizationService.getText(TranslationKeys.RoomNotFound, this.getUserLanguage(client))
          }),
        );
        return;
      }

      if (!this.validateRoomPhase(roomId, RoomPhase.PLAYING, userId)) return;

      // 버리기 횟수 체크 및 증가
      if (!this.roomService.canUserDiscard(roomId, userId)) {
        this.emitUserResponse(
          client,
          new DiscardResponseDto({
            success: false,
            message: TranslationKeys.InvalidDiscard,
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
        new ErrorResponseDto({ message: TranslationKeys.InvalidDiscard }),
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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleHandPlayReady] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: TranslationKeys.RoomNotFound }),
        );
        return;
      }

      if (!this.validateRoomPhase(roomId, RoomPhase.PLAYING, userId)) return;

      // 선택된 카드가 없으면 리턴
      if (!data.playCards || data.playCards.length === 0) {
        this.logger.warn(
          `[handleHandPlayReady] 선택된 카드가 없음: userId=${userId}, roomId=${roomId}`,
        );
        return;
      }

      if (this.roomService.hasUserHandPlay(roomId, userId)) {
        this.logger.warn(
          `[handleHandPlayReady] 이미 제출된 유저의 중복 요청 무시: userId=${userId}, roomId=${roomId}`,
        );
        return;
      }

      this.roomService.handPlayReady(roomId, userId, data.playCards);


      this.emitRoomResponse(
        roomId,
        new HandPlayReadyResponseDto({ userId }),
      );

      const userIds = this.getRoomUserIds(roomId);

      // playing 상태인 유저들만 필터링
      const playingUserIds = this.roomService.getPlayingUserIds(roomId, userIds);

      if (this.roomService.canRevealHandPlay(roomId, userIds)) {
        try {
          // HandPlayResult 바로 시작
          await this.startHandPlayResult(roomId);
        } catch (error) {
          this.logger.error(`[handleHandPlayReady] Error starting hand play result: roomId=${roomId}`, error);
        }
      }
    } catch (error) {
      this.logger.error(
        `[handleHandPlayReady] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: TranslationKeys.InvalidRequest }),
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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleNextRound] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: TranslationKeys.RoomNotFound }),
        );
        return;
      }


      this.roomService.setNextRoundReady(roomId, userId);

      this.emitRoomResponse(
        roomId,
        new NextRoundReadyResponseDto({ userId }),
      );

      if (this.roomService.canStartNextRound(roomId)) {
        await this.startGameForRoom(roomId);
      }
    } catch (error) {
      this.emitUserResponse(
        client,
        new ErrorResponseDto({ message: TranslationKeys.InvalidRequest }),
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


      // socketId로 roomId 찾기
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleBuyCard] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: TranslationKeys.RoomNotFound }),
        );
        return;
      }

      if (!this.validateRoomPhase(roomId, RoomPhase.SHOP, userId)) return;

      const result = await this.roomService.buyCard(
        roomId,
        userId,
        data.cardId,
      );

      if (result.success) {

        // 구매한 유저에게는 firstDeckCards와 planetCardIds 포함하여 응답
        const buyerResponse = new BuyCardResponseDto({
          success: true,
          userId: userId,
          cardId: data.cardId,
          funds: result.funds ?? 0,
          message: this.localizationService.getText(TranslationKeys.CardPurchaseCompleted, this.getUserLanguage(client)),
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
          message: this.localizationService.getText(TranslationKeys.CardPurchaseCompleted, this.getUserLanguage(client)),
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
          message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
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
        new ErrorResponseDto({ message: TranslationKeys.PurchaseFailed }),
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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(
          `[handleSellCard] socketId=${client.id}가 어떤 방에도 속해있지 않습니다.`,
        );
        this.emitUserResponse(
          client,
          new SellCardResponseDto({
            success: false,
            message: TranslationKeys.RoomNotFound,
          }),
        );
        return;
      }

      const result = await this.roomService.sellCard(
        roomId,
        userId,
        data.cardId,
      );

      if (result.success) {
        const res = new SellCardResponseDto({
          success: true,
          message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
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
          message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
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
        message: TranslationKeys.SaleFailed,
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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleReRollShop] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        this.emitUserResponse(
          client,
          new ErrorResponseDto({ message: TranslationKeys.RoomNotFound }),
        );
        return;
      }

      // 유저의 funds 확인 (다시뽑기 가격: 5)
      const userChips = await this.roomService.getUserChips(roomId, userId);
      if (userChips.funds < 5) {
        this.logger.warn(
          `[handleReRollShop] 다시뽑기 실패 - funds 부족: userId=${userId}, funds=${userChips.funds}, required=5`,
        );
        const res = new ReRollShopResponseDto({
          success: false,
          message: TranslationKeys.InsufficientFunds,
          cardIds: [],
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
          message: TranslationKeys.RerollFailed,
          cardIds: [],
        });
        this.emitUserResponse(client, res);
        return;
      }

      // 차감 후 남은 funds 가져오기
      const updatedUserChips = await this.roomService.getUserChips(roomId, userId);

      // 요청한 유저에게는 카드 정보를 포함한 응답 전송
      const userRes = new ReRollShopResponseDto({
        success: true,
        cardIds: reRollCards.map(card => card.id),
        userId: userId,
        funds: updatedUserChips.funds,
      });
      this.emitUserResponse(client, userRes);

      // 다른 유저들에게는 funds 업데이트만 전송
      const otherUsersRes = new ReRollShopResponseDto({
        success: true,
        cardIds: [], // 빈 배열
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
        message: TranslationKeys.RerollFailed,
        cardIds: [],
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
      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(
          `[handleReorderJokers] socketId=${client.id}가 어떤 방에도 속해있지 않습니다.`,
        );
        this.emitUserResponse(
          client,
          new ReorderJokersResponseDto({
            success: false,
            message: TranslationKeys.RoomNotFound,
            userId: userId,
            jokerIds: [],
          }),
        );
        return;
      }

      const result = await this.roomService.reorderJokers(
        roomId,
        userId,
        data.jokerIds,
      );

      if (result.success) {

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
          message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
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
      const userId = this.getUserId(client.id) || '';
      const res = new ReorderJokersResponseDto({
        success: false,
        message: TranslationKeys.InvalidJokerOrder,
        userId: userId,
        jokerIds: [],
      });
      this.emitUserResponse(client, res);
    }
  }



  // === 베팅 응답 처리 ===
  @SubscribeMessage(BettingRequestDto.requestEventName)
  async handleBettingRequest(
    @MessageBody() data: BettingRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      const roomId = this.getUserRoomId(client.id);
      if (!roomId) {
        this.logger.warn(`[handleBettingRequest] socketId=${client.id}가 속한 방을 찾을 수 없습니다.`);
        return;
      }

      // 베팅 차례 확인
      const roomState = this.roomService.getRoomState(roomId);
      if (roomState.bettingState.currentUser !== userId) {
        this.logger.warn(`[handleBettingRequest] 베팅 차례가 아닌 유저의 요청 무시: userId=${userId}, currentUser=${roomState.bettingState.currentUser}`);
        return;
      }

      // 베팅 처리
      const result = await this.roomService.processBetting(roomId, userId, data.bettingType);

      // 베팅 결과 전송
      this.emitRoomResponse(roomId, new BettingResultDto(result));

      // 마지막 플레이어 승리 처리
      const lastPlayerWinResult = await this.roomService.handleLastPlayerWin(roomId);

      if (lastPlayerWinResult.success && lastPlayerWinResult.lastWinnerId) {
        // 마지막 플레이어 승리인 경우 별도 응답 전송
        this.emitRoomResponse(
          roomId,
          new LastPlayerWinResponseDto({
            lastWinnerId: lastPlayerWinResult.lastWinnerId,
            chipsGain: lastPlayerWinResult.chipsGain || 0,
            originalChipsGain: lastPlayerWinResult.originalChipsGain || 0,
            finalChips: lastPlayerWinResult.finalChips || 0,
          })
        );
      }
      else {
        // 다음 베팅 유저 설정
        const nextUser = this.roomService.setNextBettingUser(roomId);

        if (nextUser && !this.roomService.isBettingRoundComplete(roomId)) {
          // 다음 유저에게 베팅 요청
          const bettingResponse = await this.roomService.createBettingResponse(roomId, false); // isFirst: false
          this.emitRoomResponse(roomId, new BettingResponseDto(bettingResponse));
        } else {
          // 베팅 라운드 완료
          const roomState = this.roomService.getRoomState(roomId);

          if (roomState.round === 5) {
            await this.processHandPlayResultAfterBetting(roomId);
          } else {
            await this.sendShopResponse(roomId);
          }
        }
      }

    } catch (error) {
      this.logger.error(`[handleBettingRequest] Error`, error);
    }
  }

  @SubscribeMessage(UseSpecialCardRequestDto.requestEventName)
  async handleUseSpecialCardRequest(
    @MessageBody() data: UseSpecialCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.validateUserRegistration(client);
    if (!userId) {
      this.emitUserResponse(client, new ErrorResponseDto({
        success: false,
        message: TranslationKeys.AuthenticationFailed,
      }));
      return;
    }

    const roomId = this.getUserRoomId(client.id);
    if (!roomId) {
      this.emitUserResponse(client, new ErrorResponseDto({
        success: false,
        message: this.localizationService.getText(TranslationKeys.NotInRoom, this.getUserLanguage(client)),
      }));
      return;
    }

    // Service에서 특별 카드 사용 처리
    const result = await this.roomService.processUseSpecialCard(roomId, userId, data.cardId, data.cards);

    // 요청한 유저에게는 카드 정보 포함하여 응답
    const requesterResponse = new UseSpecialCardResponseDto({
      success: result.success,
      message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
      userId: userId,
      cardId: data.cardId,
      selectedCards: result.selectedCards,
      resultCards: result.resultCards
    });
    this.emitUserResponse(client, requesterResponse);

    // 다른 유저들에게는 카드 정보 없이 응답
    const otherUsersResponse = new UseSpecialCardResponseDto({
      success: result.success,
      message: this.localizationService.getText(result.message as TranslationKeys, this.getUserLanguage(client)),
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

      if (!isClientVersionSupported(data.version)) {
        this.logger.warn(
          `[handleLogin] Unsupported client version: ${getVersionString(data.version)}, socketId=${client.id}`,
        );
        const res = new LoginResponseDto({
          success: false,
          code: 1003,
          message: this.localizationService.getText(TranslationKeys.ClientVersionIncompatible, this.getUserLanguage(client), getVersionString(data.version), `Required: ${getVersionString(MIN_CLIENT_VERSION)} or higher`),
        });
        this.emitUserResponse(client, res);
        return;
      }

      const user = await this.authService.validateUser(
        data.userId,
        data.password,
      );
      if (!user) {
        const res = new LoginResponseDto({
          success: false,
          code: 1001,
          message: TranslationKeys.AuthenticationFailed,
        });
        this.emitUserResponse(client, res);
        return;
      }

      const connectionResult =
        await this.authService.checkAndRegisterConnection(user.userId);
      if (!connectionResult.isNewConnection) {
        const res = new LoginResponseDto({
          success: false,
          code: 1002,
          message: connectionResult.message,
        });
        this.emitUserResponse(client, res);
        return;
      }

      // 세션 생성
      this.socketSessions.set(client.id, {
        userId: user.userId,
        roomId: null,
        language: data.language || 'en'
      });

      // 로그인할 때마다 DB에서 스페셜카드 데이터 다시 읽어들이기
      await this.specialCardManagerService.initializeCards(this.roomService['prisma']);

      const res = new LoginResponseDto({
        success: true,
        code: 0,
        message: TranslationKeys.Login,
        userId: user.userId,
        nickname: user.nickname,
        silverChip: user.silverChip,
        goldChip: user.goldChip,
        createdAt: user.createdAt.toISOString(),
      });
      this.emitUserResponse(client, res);

    } catch (error) {
      const res = new LoginResponseDto({
        success: false,
        code: 1000,
        message: TranslationKeys.ServerError,
      });
      this.emitUserResponse(client, res);
    }
  }


  onModuleInit() {
    (
      global as unknown as { roomGatewayInstance: RoomGateway }
    ).roomGatewayInstance = this;
    this.logger.log('[RoomGateway] 글로벌 인스턴스 등록 완료');
  }
}
