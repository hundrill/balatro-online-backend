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
import { JokerCard, PlanetCard, TarotCard } from './joker-cards.util';
import { LoginRequestDto } from './socket-dto/login-request.dto';
import { ReadyRequestDto } from './socket-dto/ready-request.dto';
import { NextRoundReadyRequestDto } from './socket-dto/next-round-request.dto';
import { HandPlayReadyRequestDto } from './socket-dto/hand-play-ready-request.dto';
import { ReRollShopRequestDto } from './socket-dto/re-roll-shop-request.dto';
import { BuyCardRequestDto } from './socket-dto/buy-card-request.dto';
import { DiscardRequestDto } from './socket-dto/discard-request.dto';
import { SellCardRequestDto } from './socket-dto/sell-card-request.dto';
import { LoginResponseDto } from './socket-dto/login-response.dto';
import { BaseSocketDto } from './socket-dto/base-socket.dto';
import { BuyCardResultDto } from './socket-dto/buy-card-response.dto';
import { SellCardResponseDto } from './socket-dto/sell-card-response.dto';
import { DiscardResponseDto } from './socket-dto/discard-response.dto';
import { ReRollShopResponseDto } from './socket-dto/re-roll-shop-response.dto';
import { HandPlayResultResponseDto } from './socket-dto/hand-play-response.dto';
import { UserJoinedResponse } from './socket-dto/user-joined-response.dto';
import { UserLeftResponse } from './socket-dto/user-left-response.dto';
import { RoomUsersResponse } from './socket-dto/room-users-response.dto';
import { StartGameResponse } from './socket-dto/start-game-response.dto';
import { HandPlayReadyResponse } from './socket-dto/hand-play-ready-response.dto';
import { NextRoundReadyResponse } from './socket-dto/next-round-ready-response.dto';
import { CardPurchasedResponse } from './socket-dto/card-purchased-response.dto';
import { ErrorResponse } from './socket-dto/error-response.dto';
// import { Card } from './deck.util'; // 사용하지 않으므로 주석 처리

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

  private discardCountMap: Map<string, Map<string, number>> = new Map(); // roomId -> userId -> count

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }
  afterInit(server: any) {
    this.logger.log('WebSocket server initialized');
  }

  emitSocketResponse(client: Socket, res: BaseSocketDto) {
    this.logger.log(`[emitSocketResponse] to ${client.id}: ${JSON.stringify(res)}`);
    client.emit('response', res);
  }

  emitSocketResponseBySocketId(socketId: string, res: BaseSocketDto) {
    this.logger.log(`[emitSocketResponseBySocketId] to ${socketId}: ${JSON.stringify(res)}`);
    this.server.to(socketId).emit('response', res);
  }

  emitRoomResponse(roomId: string, res: BaseSocketDto) {
    this.logger.log(`[emitRoomResponse] to ${roomId}: ${JSON.stringify(res)}`);
    this.server.to(roomId).emit('response', res);
  }

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

      // Redis에서 연결 정보 제거
      if (userId) {
        await this.authService.removeConnection(userId);
      }

      this.socketIdToUserId.delete(client.id);
      // socketIdToRoomIds에서 방 목록 가져오기
      const joinedRoomIds = this.socketIdToRoomIds.get(client.id)
        ? Array.from(this.socketIdToRoomIds.get(client.id)!)
        : [];
      this.socketIdToRoomIds.delete(client.id);
      if (userId) {
        // 모든 방에서 직접 removeUserFromRoom 호출 (최적화)
        for (const roomId of joinedRoomIds) {
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
        // 각 방에 대해 roomUsers emit
        for (const roomId of joinedRoomIds) {
          const users = await this.getRoomUserInfos(roomId);
          this.logger.log(
            `[handleDisconnect] roomUsers emit: roomId=${roomId}, users=${JSON.stringify(users)}`,
          );
          this.emitRoomResponse(roomId, new RoomUsersResponse({ users }));
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

  /**
   * 현재 방에 접속 중인 유저들의 userId, nickname 정보를 반환
   */
  private async getRoomUserInfos(roomId: string): Promise<
    {
      userId: string;
      nickname: string | null;
      silverChip: number;
      goldChip: number;
    }[]
  > {
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId); // Set<socketId>
    const userIds: string[] = [];
    if (room) {
      for (const socketId of room) {
        const userId = this.socketIdToUserId.get(socketId);
        if (userId) userIds.push(userId);
      }
    }
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const user = await this.userService.findByEmail(userId);
        return user
          ? {
            userId: user.email,
            nickname: user.nickname,
            silverChip: user.silverChip,
            goldChip: user.goldChip,
          }
          : { userId, nickname: null, silverChip: 0, goldChip: 0 };
      }),
    );
    return users;
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[handleJoinRoom] joinRoom: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

      // 로그인 시 이미 중복 접속 체크가 완료되었으므로, 방 입장만 처리
      await client.join(data.roomId);
      this.socketIdToUserId.set(client.id, data.userId);
      // socketIdToRoomIds에 방 추가
      if (!this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.set(client.id, new Set());
      }
      this.socketIdToRoomIds.get(client.id)!.add(data.roomId);

      this.emitSocketResponse(client, new UserJoinedResponse({ userId: data.userId }));

      // 방의 모든 유저 정보(roomUsers) 브로드캐스트
      const users = await this.getRoomUserInfos(data.roomId);
      this.logger.log(
        `[handleJoinRoom] roomUsers emit: users=${JSON.stringify(users)}`,
      );
      this.emitRoomResponse(data.roomId, new RoomUsersResponse({ users }));

      this.logger.log(
        `[handleJoinRoom] joinRoom SUCCESS: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleJoinRoom] Error in joinRoom: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to join room' }),
      );
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleLeaveRoom] leaveRoom: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      // phase가 'waiting'이 아닐 때 무시
      const state = this.roomService['gameStates'].get(data.roomId);
      if (!state || state.phase !== 'waiting') {
        this.logger.warn(
          `[handleLeaveRoom] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
        );
        //return; // 테스트때문에 주석 처리
      }
      await client.leave(data.roomId);
      // socketIdToRoomIds에서 방 제거
      if (this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.get(client.id)!.delete(data.roomId);
        if (this.socketIdToRoomIds.get(client.id)!.size === 0) {
          this.socketIdToRoomIds.delete(client.id);
        }
      }
      if (userId) {
        // 요청한 유저(본인)에게만 userLeft 이벤트 전송, userId 인자 제거
        this.emitSocketResponse(client, new UserLeftResponse({}));
        await this.roomService.removeUserFromRoom(
          data.roomId,
          userId,
          this.socketIdToRoomIds,
          this.socketIdToUserId,
        );
        this.logger.log(
          `[handleLeaveRoom] leaveRoom SUCCESS: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
        );
        // === 방의 모든 유저 정보(roomUsers) 브로드캐스트 (퇴장 후) ===
        const users = await this.getRoomUserInfos(data.roomId);
        this.logger.log(
          `[handleLeaveRoom] roomUsers emit: roomId=${data.roomId}, users=${JSON.stringify(users)}`,
        );
        this.emitRoomResponse(
          data.roomId,
          new RoomUsersResponse({ users }),
        );
      } else {
        this.logger.warn(
          `[handleLeaveRoom] userId not found for socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[handleLeaveRoom] Error in leaveRoom: socketId=${client.id}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to leave room' }),
      );
    }
  }

  @SubscribeMessage('ready')
  async handleReady(
    @MessageBody() data: ReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketIdToUserId.get(client.id);
    this.logger.log(
      `[handleReady] ready: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
    );
    if (!userId) {
      this.logger.warn(
        `[handleReady] userId not found for socketId=${client.id}`,
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'User not registered' }),
      );
      return;
    }
    const state = this.roomService['gameStates'].get(data.roomId);
    if (!state || state.phase !== 'waiting') {
      this.logger.warn(
        `[handleReady] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
      );
      return;
    }
    this.roomService.setReady(data.roomId, userId);
    this.logger.log(
      `[handleReady] setReady 완료: userId=${userId}, roomId=${data.roomId}`,
    );
    if (this.roomService.canStart(data.roomId)) {
      this.logger.log(
        `[handleReady] 모든 유저 준비 완료, 게임 시작: roomId=${data.roomId}`,
      );

      // Socket.IO 방에서 userId 배열 추출
      const adapter = this.server.of('/').adapter;
      const room = adapter.rooms.get(data.roomId);
      const userIds: string[] = [];
      if (room) {
        for (const socketId of room) {
          const uid = this.socketIdToUserId.get(socketId);
          if (uid) userIds.push(uid);
        }
      }

      this.roomService.startGame(data.roomId);
      // 라운드 시작 시 discardCountMap 초기화
      this.discardCountMap.set(data.roomId, new Map());
      const round = this.roomService.getRound(data.roomId);
      if (room) {
        for (const socketId of room) {
          const uid = this.socketIdToUserId.get(socketId);
          if (!uid) continue;
          const myCards = this.roomService.getUserHand(data.roomId, uid);
          // 상대방 userId만 배열로 추출
          const opponents = Array.from(room)
            .map((sid) => this.socketIdToUserId.get(sid))
            .filter(
              (otherId): otherId is string =>
                typeof otherId === 'string' && otherId !== uid,
            );
          const silverSeedChip = this.roomService.getSilverSeedChip(
            data.roomId,
          );
          const goldSeedChip = this.roomService.getGoldSeedChip(data.roomId);

          // 모든 유저의 funds 정보 수집
          const userFunds: Record<string, number> = {};
          for (const userId of userIds) {
            const userChips = await this.roomService.getUserChips(
              data.roomId,
              userId,
            );
            userFunds[userId] = userChips.funds;
          }

          this.emitSocketResponseBySocketId(
            socketId,
            new StartGameResponse({
              myCards,
              opponents,
              round,
              silverSeedChip,
              goldSeedChip,
              userFunds,
            }),
          );
        }
      }
    }
  }

  @SubscribeMessage('discard')
  handleDiscard(
    @MessageBody()
    data: DiscardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      if (!userId) {
        this.emitSocketResponse(
          client,
          new ErrorResponse({ message: 'User not registered' }),
        );
        return;
      }
      // phase가 'playing'이 아니면 무시
      const state = this.roomService['gameStates'].get(data.roomId);
      if (!state || state.phase !== 'playing') {
        this.logger.warn(
          `[handleDiscard] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
        );
        return;
      }
      // === discard 횟수 체크 ===
      if (!this.discardCountMap.has(data.roomId)) {
        this.discardCountMap.set(data.roomId, new Map());
      }
      const userMap = this.discardCountMap.get(data.roomId)!;
      const count = userMap.get(userId) ?? 0;
      if (count >= 4) {
        this.emitSocketResponse(
          client,
          new ErrorResponse({
            message: '버리기는 라운드당 최대 4번만 가능합니다.',
          }),
        );
        return;
      }
      userMap.set(userId, count + 1);
      // discard 처리
      const { newHand, discarded } = this.roomService.discardAndDraw(
        data.roomId,
        userId,
        data.cards,
      );
      // 남은 discard 횟수 계산
      const remainingDiscards = 4 - (count + 1);
      const res = new DiscardResponseDto({
        newHand,
        discarded,
        remainingDiscards,
      });
      this.emitSocketResponse(client, res);
    } catch (error) {
      this.logger.error(
        `[handleDiscard] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to discard cards' }),
      );
    }
  }

  @SubscribeMessage('handPlayReady')
  async handleHandPlayReady(
    @MessageBody()
    data: HandPlayReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      if (!userId) {
        this.emitSocketResponse(
          client,
          new ErrorResponse({ message: 'User not registered' }),
        );
        return;
      }
      // phase가 'playing'이 아니면 무시
      const state = this.roomService['gameStates'].get(data.roomId);
      if (!state || state.phase !== 'playing') {
        this.logger.warn(
          `[handleHandPlayReady] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
        );
        return;
      }
      // 이미 제출한 유저면 무시
      const handMap = this.roomService['handPlayMap'].get(data.roomId);
      if (handMap && handMap.has(userId)) {
        this.logger.warn(
          `[handleHandPlayReady] 이미 제출된 유저의 중복 요청 무시: userId=${userId}, roomId=${data.roomId}`,
        );
        return;
      }
      // 유저별 최종 핸드 서버에 저장
      this.roomService.handPlayReady(data.roomId, userId, data.hand);
      this.logger.log(
        `[handleHandPlayReady] userId=${userId}, roomId=${data.roomId}, hand=${JSON.stringify(data.hand)}`,
      );
      // 준비한 유저를 즉시 브로드캐스트
      this.emitRoomResponse(
        data.roomId,
        new HandPlayReadyResponse({ userId }),
      );

      // Socket.IO 방에서 userId 배열 추출
      const adapter = this.server.of('/').adapter;
      const room = adapter.rooms.get(data.roomId);
      const userIds: string[] = [];
      if (room) {
        for (const socketId of room) {
          const uid = this.socketIdToUserId.get(socketId);
          if (uid) userIds.push(uid);
        }
      }
      // 모든 유저가 제출했는지 체크
      if (this.roomService.canRevealHandPlay(data.roomId, userIds)) {
        // 모든 유저의 핸드 모아서 브로드캐스트
        const allHandsRaw = this.roomService.getAllHandPlays(data.roomId);

        // allHands를 userId를 키로 하는 객체로 변환
        const allHands: Record<string, any[]> = {};
        if (Array.isArray(allHandsRaw)) {
          for (const handData of allHandsRaw) {
            if (
              handData &&
              typeof handData === 'object' &&
              'userId' in handData &&
              'hand' in handData
            ) {
              allHands[handData.userId] = handData.hand || [];
            }
          }
        }
        // === [1] 각 유저의 ownedCards 포함 ===
        const ownedCards: Record<
          string,
          (JokerCard | PlanetCard | TarotCard)[]
        > = {};
        for (const uid of userIds) {
          ownedCards[uid] = this.roomService.getUserOwnedCards(
            data.roomId,
            uid,
          );
        }
        // userIds를 순회하며 각 유저에게 자신의 shopCards만 포함해 개별 emit
        if (room) {
          for (const socketId of room) {
            const uid = this.socketIdToUserId.get(socketId);
            if (!uid) continue;
            const myShopCards = this.roomService.getShopCards(data.roomId);

            // 모든 유저별 점수와 칩 정보 생성 (테스트용으로 모두 10으로 설정)
            const roundResult: Record<
              string,
              {
                hand: any;
                score: number;
                silverChipGain: number;
                goldChipGain: number;
                finalSilverChips: number;
                finalGoldChips: number;
                finalFunds: number;
              }
            > = {};

            // 각 유저별로 실제 칩 정보와 테스트 데이터 설정
            for (const userId of userIds) {
              // 라운드 종료 시 funds에 4 추가
              await this.roomService.updateUserChips(
                data.roomId,
                userId,
                0,
                0,
                4,
              );
              const updatedChips = await this.roomService.getUserChips(
                data.roomId,
                userId,
              );

              roundResult[userId] = {
                hand: allHands[userId] || [],
                score: 10, // 테스트 값
                silverChipGain: 10, // 테스트 값 (+10 획득)
                goldChipGain: 0, // 테스트 값 (0 획득)
                finalSilverChips: updatedChips.silverChips, // 실제 값
                finalGoldChips: updatedChips.goldChips, // 실제 값
                finalFunds: updatedChips.funds, // 실제 값 (4가 추가된 후)
              };
            }

            const res = new HandPlayResultResponseDto({
              roundResult,
              shopCards: myShopCards,
              ownedCards,
              round: this.roomService.getRound(data.roomId),
            });
            this.emitSocketResponseBySocketId(socketId, res);
          }
        }
        // handPlayResult emit 후, phase를 'shop'으로 변경
        const prevState = this.roomService['gameStates'].get(data.roomId);
        if (prevState) {
          this.roomService['gameStates'].set(data.roomId, {
            ...prevState,
            phase: 'shop',
          });
        }
        // handPlayResult emit 후, round 값을 1 증가시키고, 5보다 크면 초기화
        const round = this.roomService.getRound(data.roomId) + 1;
        if (round > 5) {
          this.roomService['gameStates'].set(data.roomId, {
            decks: new Map(),
            hands: new Map(),
            round: 1,
            phase: 'waiting',
          });
          this.roomService['handPlayMap'].delete(data.roomId);
          this.roomService['nextRoundReadyMap'].delete(data.roomId);
          this.roomService['shopCardsMap'].delete(data.roomId);
          this.roomService['gameReadyMap'].delete(data.roomId);
          this.roomService['userOwnedCardsMap'].delete(data.roomId);
        } else {
          // round만 증가
          const prevState = this.roomService['gameStates'].get(data.roomId);
          if (prevState) {
            this.roomService['gameStates'].set(data.roomId, {
              ...prevState,
              round,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `[handleHandPlayReady] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to submit hand play' }),
      );
    }
  }

  @SubscribeMessage('nextRound')
  async handleNextRound(
    @MessageBody() data: NextRoundReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleNextRound] nextRound: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      if (!userId) {
        this.logger.warn(
          `[handleNextRound] userId not found for socketId=${client.id}`,
        );
        this.emitSocketResponse(
          client,
          new ErrorResponse({ message: 'User not registered' }),
        );
        return;
      }
      // 준비 상태 저장
      this.roomService.setNextRoundReady(data.roomId, userId);
      this.logger.log(
        `[handleNextRound] nextRoundReady 완료: userId=${userId}, roomId=${data.roomId}`,
      );
      // 준비한 유저를 즉시 브로드캐스트
      this.emitRoomResponse(
        data.roomId,
        new NextRoundReadyResponse({ userId }),
      );
      // Socket.IO 방에서 userId 배열 추출
      const adapter = this.server.of('/').adapter;
      const room = adapter.rooms.get(data.roomId);
      const userIds: string[] = [];
      if (room) {
        for (const socketId of room) {
          const uid = this.socketIdToUserId.get(socketId);
          if (uid) userIds.push(uid);
        }
      }
      // 모든 유저가 준비됐는지 체크
      if (this.roomService.canStartNextRound(data.roomId, userIds)) {
        this.logger.log(
          `[handleNextRound] 모든 유저 nextRound 완료, 다음 라운드 시작: roomId=${data.roomId}`,
        );

        void this.roomService.startGame(data.roomId);
        // 라운드 시작 시 discardCountMap 초기화
        this.discardCountMap.set(data.roomId, new Map());
        const round = this.roomService.getRound(data.roomId);
        if (room) {
          for (const socketId of room) {
            const uid = this.socketIdToUserId.get(socketId);
            if (!uid) continue;
            const myCards = this.roomService.getUserHand(data.roomId, uid);
            // 상대방 userId만 배열로 추출 (handleReady와 동일한 방식)
            const opponents = Array.from(room)
              .map((sid) => this.socketIdToUserId.get(sid))
              .filter(
                (otherId): otherId is string =>
                  typeof otherId === 'string' && otherId !== uid,
              );
            const silverSeedChip = this.roomService.getSilverSeedChip(
              data.roomId,
            );
            const goldSeedChip = this.roomService.getGoldSeedChip(data.roomId);

            // 모든 유저의 funds 정보 수집
            const userFunds: Record<string, number> = {};
            for (const userId of userIds) {
              const userChips = await this.roomService.getUserChips(
                data.roomId,
                userId,
              );
              userFunds[userId] = userChips.funds;
            }

            this.logger.log(
              `[handleNextRound] [startGame emit] to userId=${uid}, socketId=${socketId}, myCards=${JSON.stringify(myCards)}, opponents=${JSON.stringify(opponents)}, round=${round}, silverSeedChip=${silverSeedChip}, goldSeedChip=${goldSeedChip}, userFunds=${JSON.stringify(userFunds)}`,
            );
            void this.emitSocketResponseBySocketId(socketId, new StartGameResponse({
              myCards,
              opponents,
              round,
              silverSeedChip,
              goldSeedChip,
              userFunds,
            }));
          }
        }
      }
    } catch (error) {
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to start next round' }),
      );
    }
  }

  @SubscribeMessage('buyCard')
  handleBuyCard(
    @MessageBody()
    data: BuyCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleBuyCard] buyCard: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, cardId=${data.cardId}, cardType=${data.cardType}, price=${data.price}`,
      );
      if (!userId) {
        this.logger.warn(
          `[handleBuyCard] userId not found for socketId=${client.id}`,
        );
        this.emitSocketResponse(
          client,
          new ErrorResponse({ message: 'User not registered' }),
        );
        return;
      }
      // phase가 'shop'이 아니면 무시
      const state = this.roomService['gameStates'].get(data.roomId);
      if (!state || state.phase !== 'shop') {
        this.logger.warn(
          `[handleBuyCard] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
        );
        return;
      }
      // 구매 처리
      const result = this.roomService.buyCard(
        data.roomId,
        userId,
        data.cardId,
        data.cardType,
        data.price,
      );

      if (result.success) {
        this.logger.log(
          `[handleBuyCard] 구매 성공: userId=${userId}, cardId=${data.cardId}, price=${data.price}`,
        );

        // 구매 성공 응답 (카드 상세 정보 포함)
        const res = new BuyCardResultDto({
          success: true,
          cardId: data.cardId,
          cardType: data.cardType,
          price: data.price,
          cardName: result.cardName,
          cardDescription: result.cardDescription,
          cardSprite: result.cardSprite,
          message: '카드 구매가 완료되었습니다.',
        });
        this.emitSocketResponse(client, res);

        // 다른 유저들에게 구매 알림
        this.emitRoomResponse(
          data.roomId,
          new CardPurchasedResponse({
            userId,
            cardId: data.cardId,
            cardType: data.cardType,
            price: data.price,
            cardName: result.cardName,
            cardDescription: result.cardDescription,
            cardSprite: result.cardSprite,
          }),
        );
      } else {
        this.logger.warn(
          `[handleBuyCard] 구매 실패: userId=${userId}, cardId=${data.cardId}, reason=${result.message}`,
        );

        // 구매 실패 응답
        const res = new BuyCardResultDto({
          success: false,
          cardId: data.cardId,
          cardType: data.cardType,
          price: data.price,
          message: result.message,
        });
        this.emitSocketResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleBuyCard] Error in buyCard: socketId=${client.id}, roomId=${data.roomId}, cardId=${data.cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitSocketResponse(
        client,
        new ErrorResponse({ message: 'Failed to buy card' }),
      );
    }
  }

  @SubscribeMessage('sellCard')
  handleSellCard(
    @MessageBody()
    data: SellCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleSellCard] sellCard: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      if (!userId) {
        this.logger.warn(
          `[handleSellCard] userId not found for socketId=${client.id}`,
        );
        return;
      }

      const result = this.roomService.sellCard(
        data.roomId,
        userId,
        data.cardId,
        data.price,
      );

      if (result.success) {
        this.logger.log(
          `[handleSellCard] 판매 성공: userId=${userId}, cardId=${data.cardId}, price=${data.price}`,
        );
        const res = new SellCardResponseDto({
          success: true,
          message: result.message,
          soldCardName: result.soldCardName,
        });
        this.emitSocketResponse(client, res);
      } else {
        this.logger.warn(
          `[handleSellCard] 판매 실패: userId=${userId}, cardId=${data.cardId}, message=${result.message}`,
        );
        const res = new SellCardResponseDto({
          success: false,
          message: result.message,
        });
        this.emitSocketResponse(client, res);
      }
    } catch (error) {
      this.logger.error(
        `[handleSellCard] Error in sellCard: socketId=${client.id}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      const res = new SellCardResponseDto({
        success: false,
        message: '판매 중 오류가 발생했습니다.',
      });
      this.emitSocketResponse(client, res);
    }
  }

  @SubscribeMessage('reRollShop')
  handleReRollShop(
    @MessageBody() data: ReRollShopRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleReRollShop] reRollShop: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      if (!userId) {
        this.logger.warn(
          `[handleReRollShop] userId not found for socketId=${client.id}`,
        );
        return;
      }

      // 다시뽑기 카드 5장 가져오기 (이미 생성된 경우 기존 카드 반환)
      const reRollCards = this.roomService.getReRollCards(data.roomId);

      this.logger.log(
        `[handleReRollShop] 다시뽑기 카드 전송: userId=${userId}, roomId=${data.roomId}, cards=${JSON.stringify(reRollCards)}`,
      );

      // 요청한 유저에게 다시뽑기 카드 전송
      const res = new ReRollShopResponseDto({
        success: true,
        cards: reRollCards,
      });
      this.emitSocketResponse(client, res);
    } catch (error) {
      this.logger.error(
        `[handleReRollShop] Error in reRollShop: socketId=${client.id}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      const res = new ReRollShopResponseDto({
        success: false,
        message: '다시뽑기 중 오류가 발생했습니다.',
        cards: [],
      });
      this.emitSocketResponse(client, res);
    }
  }

  @SubscribeMessage('login')
  async handleLogin(
    @MessageBody() data: LoginRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[handleLogin] login attempt: socketId=${client.id}, email=${data.email}`,
      );

      // 사용자 인증
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
        this.emitSocketResponse(client, res);
        return;
      }

      // 중복 접속 체크
      const connectionResult =
        await this.authService.checkAndRegisterConnection(user.email);
      if (!connectionResult.isNewConnection) {
        const res = new LoginResponseDto({
          success: false,
          code: 1002,
          message: connectionResult.message,
        });
        this.emitSocketResponse(client, res);
        return;
      }

      // socketIdToUserId에 매핑 추가
      this.socketIdToUserId.set(client.id, user.email);

      // 로그인 성공 응답
      const res = new LoginResponseDto({
        success: true,
        code: 0,
        message: 'Login successful',
        email: user.email,
        nickname: user.nickname,
        silverChip: user.silverChip,
        goldChip: user.goldChip,
      });
      this.emitSocketResponse(client, res);

      this.logger.log(
        `[handleLogin] login success: socketId=${client.id}, email=${user.email}`,
      );
    } catch (error) {
      const res = new LoginResponseDto({
        success: false,
        code: 1000,
        message: 'Internal server error',
      });
      this.emitSocketResponse(client, res);
    }
  }

  onModuleInit() {
    (
      global as unknown as { roomGatewayInstance: unknown }
    ).roomGatewayInstance = this;
    this.logger.log('[RoomGateway] 글로벌 인스턴스 등록 완료');
  }
}
