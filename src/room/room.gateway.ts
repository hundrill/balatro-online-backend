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
import { NextRoundReadyRequestDto } from './socket-dto/next-round-ready-request.dto';
import { HandPlayReadyRequestDto } from './socket-dto/hand-play-ready-request.dto';
import { ReRollShopRequestDto } from './socket-dto/re-roll-shop-request.dto';
import { BuyCardRequestDto } from './socket-dto/buy-card-request.dto';
import { DiscardRequestDto } from './socket-dto/discard-request.dto';
import { SellCardRequestDto } from './socket-dto/sell-card-request.dto';
import { JoinRoomRequestDto } from './socket-dto/join-room-request.dto';
import { LeaveRoomRequestDto } from './socket-dto/leave-room-request.dto';
import { LoginResponseDto } from './socket-dto/login-response.dto';
import { BaseSocketDto } from './socket-dto/base-socket.dto';
import { BuyCardResponseDto } from './socket-dto/buy-card-response.dto';
import { SellCardResponseDto } from './socket-dto/sell-card-response.dto';
import { DiscardResponseDto } from './socket-dto/discard-response.dto';
import { ReRollShopResponseDto } from './socket-dto/re-roll-shop-response.dto';
import { HandPlayResultResponseDto } from './socket-dto/hand-play-result-response.dto';
import { UserJoinedResponseDto } from './socket-dto/user-joined-response.dto';
import { UserLeftResponseDto } from './socket-dto/user-left-response.dto';
import { RoomUsersResponseDto } from './socket-dto/room-users-response.dto';
import { StartGameResponseDto } from './socket-dto/start-game-response.dto';
import { HandPlayReadyResponseDto } from './socket-dto/hand-play-ready-response.dto';
import { NextRoundReadyResponseDto } from './socket-dto/next-round-ready-response.dto';
import { CardPurchasedResponseDto } from './socket-dto/card-purchased-response.dto';
import { ErrorResponseDto } from './socket-dto/error-response.dto';

interface RoomUserInfo {
  userId: string;
  nickname: string | null;
  silverChip: number;
  goldChip: number;
}

interface GameState {
  phase: string;
  decks?: Map<string, any[]>;
  hands?: Map<string, any[]>;
  round?: number;
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

  private discardCountMap: Map<string, Map<string, number>> = new Map(); // roomId -> userId -> count

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) { }

  afterInit(server: any) {
    this.logger.log('WebSocket server initialized');
  }

  // === 유틸리티 메서드들 ===

  /**
   * 소켓 응답 전송
   */
  private emitSocketResponse(client: Socket, res: BaseSocketDto) {
    this.logger.log(`[emitSocketResponse] to ${client.id}: ${JSON.stringify(res)}`);
    client.emit('response', res);
  }

  /**
   * 소켓 ID로 응답 전송
   */
  private emitSocketResponseBySocketId(socketId: string, res: BaseSocketDto) {
    this.logger.log(`[emitSocketResponseBySocketId] to ${socketId}: ${JSON.stringify(res)}`);
    this.server.to(socketId).emit('response', res);
  }

  /**
   * 방 전체에 응답 전송
   */
  private emitRoomResponse(roomId: string, res: BaseSocketDto) {
    this.logger.log(`[emitRoomResponse] to ${roomId}: ${JSON.stringify(res)}`);
    this.server.to(roomId).emit('response', res);
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
    const state = this.roomService['gameStates'].get(roomId) as GameState | undefined;
    if (!state || state.phase !== expectedPhase) {
      this.logger.warn(
        `잘못된 phase에서 요청 무시: userId=${userId}, roomId=${roomId}, phase=${state?.phase}, expected=${expectedPhase}`,
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
      this.emitSocketResponse(
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

  /**
   * 게임 시작 로직 (handleReady와 handleNextRound에서 공통 사용)
   */
  private async startGameForRoom(roomId: string) {
    this.roomService.startGame(roomId);
    this.discardCountMap.set(roomId, new Map());

    const round = this.roomService.getRound(roomId);
    const userIds = this.getRoomUserIds(roomId);
    const adapter = this.server.of('/').adapter;
    const room = adapter.rooms.get(roomId);

    if (!room) return;

    // 모든 유저의 funds 정보 수집
    const userFunds: Record<string, number> = {};
    for (const userId of userIds) {
      const userChips = await this.roomService.getUserChips(roomId, userId);
      userFunds[userId] = userChips.funds;
    }

    for (const socketId of room) {
      const uid = this.socketIdToUserId.get(socketId);
      if (!uid) continue;

      const myCards = this.roomService.getUserHand(roomId, uid);
      const opponents = userIds.filter(id => id !== uid);
      const silverSeedChip = this.roomService.getSilverSeedChip(roomId);
      const goldSeedChip = this.roomService.getGoldSeedChip(roomId);

      this.emitSocketResponseBySocketId(
        socketId,
        new StartGameResponseDto({
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

  /**
   * 라운드 종료 처리
   */
  private handleRoundEnd(roomId: string) {
    const round = this.roomService.getRound(roomId) + 1;

    if (round > 5) {
      // 게임 종료 - 모든 상태 초기화
      this.roomService['gameStates'].set(roomId, {
        decks: new Map(),
        hands: new Map(),
        round: 1,
        phase: 'waiting',
      });
      this.roomService['handPlayMap'].delete(roomId);
      this.roomService['nextRoundReadyMap'].delete(roomId);
      this.roomService['shopCardsMap'].delete(roomId);
      this.roomService['gameReadyMap'].delete(roomId);
      this.roomService['userOwnedCardsMap'].delete(roomId);
    } else {
      // 다음 라운드로 진행
      const prevState = this.roomService['gameStates'].get(roomId);
      if (prevState) {
        this.roomService['gameStates'].set(roomId, {
          ...prevState,
          round,
        });
      }
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

  @SubscribeMessage('JoinRoomRequest')
  async handleJoinRoom(
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

      this.emitSocketResponse(client, new UserJoinedResponseDto({ userId: data.userId }));

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
      this.emitSocketResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to join room' }),
      );
    }
  }

  @SubscribeMessage('LeaveRoomRequest')
  async handleLeaveRoom(
    @MessageBody() data: LeaveRoomRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleLeaveRoom] leaveRoom: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

      const state = this.roomService['gameStates'].get(data.roomId);
      if (!state || state.phase !== 'waiting') {
        this.logger.warn(
          `[handleLeaveRoom] 잘못된 phase에서 요청 무시: userId=${userId}, roomId=${data.roomId}, phase=${state?.phase}`,
        );
      }

      await client.leave(data.roomId);

      if (this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.get(client.id)!.delete(data.roomId);
        if (this.socketIdToRoomIds.get(client.id)!.size === 0) {
          this.socketIdToRoomIds.delete(client.id);
        }
      }

      if (userId) {
        this.emitSocketResponse(client, new UserLeftResponseDto({}));
        await this.roomService.removeUserFromRoom(
          data.roomId,
          userId,
          this.socketIdToRoomIds,
          this.socketIdToUserId,
        );

        this.logger.log(
          `[handleLeaveRoom] leaveRoom SUCCESS: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
        );

        const users = await this.getRoomUserInfos(data.roomId);
        this.logger.log(
          `[handleLeaveRoom] roomUsers emit: roomId=${data.roomId}, users=${JSON.stringify(users)}`,
        );
        this.emitRoomResponse(
          data.roomId,
          new RoomUsersResponseDto({ users }),
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
        new ErrorResponseDto({ message: 'Failed to leave room' }),
      );
    }
  }

  // === 게임 로직 ===

  @SubscribeMessage('ReadyRequest')
  async handleReady(
    @MessageBody() data: ReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.validateUserRegistration(client);
    if (!userId) return;

    this.logger.log(
      `[handleReady] ready: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
    );

    if (!this.validateRoomPhase(data.roomId, 'waiting', userId)) return;

    this.roomService.setReady(data.roomId, userId);
    this.logger.log(
      `[handleReady] setReady 완료: userId=${userId}, roomId=${data.roomId}`,
    );

    if (this.roomService.canStart(data.roomId)) {
      this.logger.log(
        `[handleReady] 모든 유저 준비 완료, 게임 시작: roomId=${data.roomId}`,
      );
      await this.startGameForRoom(data.roomId);
    }
  }

  @SubscribeMessage('DiscardRequest')
  handleDiscard(
    @MessageBody() data: DiscardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      if (!this.validateRoomPhase(data.roomId, 'playing', userId)) return;

      if (!this.discardCountMap.has(data.roomId)) {
        this.discardCountMap.set(data.roomId, new Map());
      }

      const userMap = this.discardCountMap.get(data.roomId)!;
      const count = userMap.get(userId) ?? 0;

      if (count >= 4) {
        this.emitSocketResponse(
          client,
          new ErrorResponseDto({
            message: '버리기는 라운드당 최대 4번만 가능합니다.',
          }),
        );
        return;
      }

      userMap.set(userId, count + 1);

      const { newHand, discarded } = this.roomService.discardAndDraw(
        data.roomId,
        userId,
        data.cards,
      );

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
        new ErrorResponseDto({ message: 'Failed to discard cards' }),
      );
    }
  }

  @SubscribeMessage('HandPlayReadyRequest')
  async handleHandPlayReady(
    @MessageBody() data: HandPlayReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      if (!this.validateRoomPhase(data.roomId, 'playing', userId)) return;

      const handMap = this.roomService['handPlayMap'].get(data.roomId);
      if (handMap && handMap.has(userId)) {
        this.logger.warn(
          `[handleHandPlayReady] 이미 제출된 유저의 중복 요청 무시: userId=${userId}, roomId=${data.roomId}`,
        );
        return;
      }

      this.roomService.handPlayReady(data.roomId, userId, data.hand);
      this.logger.log(
        `[handleHandPlayReady] userId=${userId}, roomId=${data.roomId}, hand=${JSON.stringify(data.hand)}`,
      );

      this.emitRoomResponse(
        data.roomId,
        new HandPlayReadyResponseDto({ userId }),
      );

      const userIds = this.getRoomUserIds(data.roomId);

      if (this.roomService.canRevealHandPlay(data.roomId, userIds)) {
        const allHandsRaw = this.roomService.getAllHandPlays(data.roomId);
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

        const ownedCards: Record<string, (JokerCard | PlanetCard | TarotCard)[]> = {};
        for (const uid of userIds) {
          ownedCards[uid] = this.roomService.getUserOwnedCards(data.roomId, uid);
        }

        const adapter = this.server.of('/').adapter;
        const room = adapter.rooms.get(data.roomId);

        if (room) {
          for (const socketId of room) {
            const uid = this.socketIdToUserId.get(socketId);
            if (!uid) continue;

            const myShopCards = this.roomService.getShopCards(data.roomId);
            const roundResult: Record<string, any> = {};

            for (const userId of userIds) {
              await this.roomService.updateUserChips(data.roomId, userId, 0, 0, 4);
              const updatedChips = await this.roomService.getUserChips(data.roomId, userId);

              let remainingDiscards = 4;
              const discardUserMap = this.discardCountMap.get(data.roomId);
              if (discardUserMap) {
                const used = discardUserMap.get(userId) ?? 0;
                remainingDiscards = 4 - used;
              }

              let remainingDeck = 0;
              let remainingSevens = 0;
              const state = this.roomService['gameStates'].get(data.roomId);
              let deck: any[] | undefined = undefined;
              if (state && state.decks) {
                deck = state.decks.get(userId);
                if (deck) {
                  remainingDeck = deck.length;
                  remainingSevens = deck.filter((c) => c.rank === 7).length;
                }
              }

              roundResult[userId] = {
                hand: allHands[userId] || [],
                score: 10,
                silverChipGain: 10,
                goldChipGain: 0,
                finalSilverChips: updatedChips.silverChips,
                finalGoldChips: updatedChips.goldChips,
                finalFunds: updatedChips.funds,
                remainingDiscards,
                remainingDeck,
                remainingSevens,
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

        const prevState = this.roomService['gameStates'].get(data.roomId);
        if (prevState) {
          this.roomService['gameStates'].set(data.roomId, {
            ...prevState,
            phase: 'shop',
          });
        }

        this.handleRoundEnd(data.roomId);
      }
    } catch (error) {
      this.logger.error(
        `[handleHandPlayReady] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.emitSocketResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to submit hand play' }),
      );
    }
  }

  @SubscribeMessage('NextRoundReadyRequest')
  async handleNextRound(
    @MessageBody() data: NextRoundReadyRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      this.logger.log(
        `[handleNextRound] nextRound: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

      this.roomService.setNextRoundReady(data.roomId, userId);
      this.logger.log(
        `[handleNextRound] nextRoundReady 완료: userId=${userId}, roomId=${data.roomId}`,
      );

      this.emitRoomResponse(
        data.roomId,
        new NextRoundReadyResponseDto({ userId }),
      );

      const userIds = this.getRoomUserIds(data.roomId);

      if (this.roomService.canStartNextRound(data.roomId, userIds)) {
        this.logger.log(
          `[handleNextRound] 모든 유저 nextRound 완료, 다음 라운드 시작: roomId=${data.roomId}`,
        );
        await this.startGameForRoom(data.roomId);
      }
    } catch (error) {
      this.emitSocketResponse(
        client,
        new ErrorResponseDto({ message: 'Failed to start next round' }),
      );
    }
  }

  // === 상점 관련 ===

  @SubscribeMessage('BuyCardRequest')
  handleBuyCard(
    @MessageBody() data: BuyCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      this.logger.log(
        `[handleBuyCard] buyCard: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, cardId=${data.cardId}, cardType=${data.cardType}, price=${data.price}`,
      );

      if (!this.validateRoomPhase(data.roomId, 'shop', userId)) return;

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

        const res = new BuyCardResponseDto({
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

        this.emitRoomResponse(
          data.roomId,
          new CardPurchasedResponseDto({
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

        const res = new BuyCardResponseDto({
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
        new ErrorResponseDto({ message: 'Failed to buy card' }),
      );
    }
  }

  @SubscribeMessage('SellCardRequest')
  handleSellCard(
    @MessageBody() data: SellCardRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      this.logger.log(
        `[handleSellCard] sellCard: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

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

  @SubscribeMessage('ReRollShopRequest')
  handleReRollShop(
    @MessageBody() data: ReRollShopRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.validateUserRegistration(client);
      if (!userId) return;

      this.logger.log(
        `[handleReRollShop] reRollShop: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );

      const reRollCards = this.roomService.getReRollCards(data.roomId);

      this.logger.log(
        `[handleReRollShop] 다시뽑기 카드 전송: userId=${userId}, roomId=${data.roomId}, cards=${JSON.stringify(reRollCards)}`,
      );

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

  // === 인증 ===

  @SubscribeMessage('LoginRequest')
  async handleLogin(
    @MessageBody() data: LoginRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[handleLogin] login attempt: socketId=${client.id}, email=${data.email}`,
      );

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

      this.socketIdToUserId.set(client.id, user.email);

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
