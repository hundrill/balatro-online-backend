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
// import { Card } from './deck.util'; // 사용하지 않으므로 주석 처리

@WebSocketGateway({ cors: true })
export class RoomGateway
  implements
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnModuleInit,
  OnGatewayInit {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  server: Server;

  // socketId <-> userId 매핑용 Map 추가
  private socketIdToUserId: Map<string, string> = new Map();
  // socketId <-> roomIds 매핑용 Map 추가
  private socketIdToRoomIds: Map<string, Set<string>> = new Map();

  constructor(
    private readonly roomService: RoomService,
    private readonly userService: UserService,
  ) { }

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
          this.server.to(roomId).emit('roomUsers', { users });
        }
      } else {
        this.logger.warn(
          `[handleDisconnect] userId not found for socketId=${client.id}`,
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `[handleDisconnect] Error handling WebSocket disconnection: socketId=${client.id}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[handleDisconnect] Error handling WebSocket disconnection: socketId=${client.id}`,
          String(error),
        );
      }
    }
  }

  /**
   * 현재 방에 접속 중인 유저들의 userId, nickname 정보를 반환
   */
  private async getRoomUserInfos(
    roomId: string,
  ): Promise<{ userId: string; nickname: string | null }[]> {
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
          ? { userId: user.email, nickname: user.nickname }
          : { userId, nickname: null };
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
      await client.join(data.roomId);
      this.socketIdToUserId.set(client.id, data.userId);
      // socketIdToRoomIds에 방 추가
      if (!this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.set(client.id, new Set());
      }
      this.socketIdToRoomIds.get(client.id)!.add(data.roomId);
      client.emit('userJoined', { userId: data.userId });

      // 방의 모든 유저 정보(roomUsers) 브로드캐스트
      const users = await this.getRoomUserInfos(data.roomId);
      this.logger.log(
        `[handleJoinRoom] roomUsers emit: users=${JSON.stringify(users)}`,
      );
      this.server.to(data.roomId).emit('roomUsers', { users });

      this.logger.log(
        `[handleJoinRoom] joinRoom SUCCESS: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
      );
    } catch (error) {
      this.logger.error(
        `[handleJoinRoom] Error in joinRoom: socketId=${client.id}, userId=${data.userId}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Failed to join room' });
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
      await client.leave(data.roomId);
      // socketIdToRoomIds에서 방 제거
      if (this.socketIdToRoomIds.has(client.id)) {
        this.socketIdToRoomIds.get(client.id)!.delete(data.roomId);
        if (this.socketIdToRoomIds.get(client.id)!.size === 0) {
          this.socketIdToRoomIds.delete(client.id);
        }
      }
      if (userId) {
        client.to(data.roomId).emit('userLeft', { userId });
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
          `[handleLeaveRoom] roomUsers emit: users=${JSON.stringify(users)}`,
        );
        this.server.to(data.roomId).emit('roomUsers', { users });
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
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleSendMessage] sendMessage: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, message=${data.message}`,
      );
      if (userId) {
        client.to(data.roomId).emit('receiveMessage', {
          userId,
          message: data.message,
        });
        this.logger.log(
          `[handleSendMessage] sendMessage SUCCESS: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
        );
      } else {
        this.logger.warn(
          `[handleSendMessage] userId not found for socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[handleSendMessage] Error in sendMessage: socketId=${client.id}, roomId=${data.roomId}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('ready')
  handleReady(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleReady] ready: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      if (!userId) {
        this.logger.warn(
          `[handleReady] userId not found for socketId=${client.id}`,
        );
        client.emit('error', { message: 'User not registered' });
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
        void this.roomService.startGame(data.roomId);
        const adapter = this.server.of('/').adapter;
        const room = adapter.rooms.get(data.roomId);
        if (room) {
          for (const socketId of room) {
            const uid = this.socketIdToUserId.get(socketId);
            if (!uid) continue;
            const myCards = this.roomService.getUserHand(data.roomId, uid);
            // 상대방 userId만 배열로 추출
            const opponents = Array.from(room)
              .map((sid) => this.socketIdToUserId.get(sid))
              .filter((otherId) => otherId && otherId !== uid);
            this.logger.log(
              `[handleReady] [startGame emit] to userId=${uid}, socketId=${socketId}, myCards=${JSON.stringify(myCards)}, opponents=${JSON.stringify(opponents)}`,
            );
            void this.server.to(socketId).emit('startGame', {
              myCards,
              opponents,
            });
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `[handleReady] Error in ready/startGame: socketId=${client.id}, roomId=${data.roomId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[handleReady] Error in ready/startGame: socketId=${client.id}, roomId=${data.roomId}`,
          String(error),
        );
      }
      client.emit('error', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('discard')
  handleDiscard(
    @MessageBody()
    data: { roomId: string; cards: { suit: string; rank: number }[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not registered' });
        return;
      }
      const { newHand, discarded } = this.roomService.discardAndDraw(
        data.roomId,
        userId,
        data.cards,
      );
      client.emit('discardResult', { newHand, discarded });
    } catch (error) {
      this.logger.error(
        `[handleDiscard] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('error', { message: 'Failed to discard cards' });
    }
  }

  @SubscribeMessage('handPlayReady')
  async handleHandPlayReady(
    @MessageBody()
    data: { roomId: string; hand: { suit: string; rank: number }[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not registered' });
        return;
      }
      // 유저별 최종 핸드 서버에 저장
      this.roomService.handPlayReady(data.roomId, userId, data.hand);
      this.logger.log(
        `[handleHandPlayReady] userId=${userId}, roomId=${data.roomId}, hand=${JSON.stringify(data.hand)}`,
      );
      // 준비한 유저를 즉시 브로드캐스트
      this.server.to(data.roomId).emit('handPlayReady', { userId });
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
      if (await this.roomService.canRevealHandPlay(data.roomId, userIds)) {
        // 모든 유저의 핸드 모아서 브로드캐스트
        const allHands = this.roomService.getAllHandPlays(data.roomId);
        const shopCards = this.roomService.getShopCards(data.roomId);
        this.logger.log(
          `[handleHandPlayReady] 모든 유저 제출 완료, handPlayResult 브로드캐스트: roomId=${data.roomId}, allHands=${JSON.stringify(allHands)}, shopCards=${JSON.stringify(shopCards)}`,
        );
        // sprite 필드가 항상 포함되도록 명시적으로 내려줌
        const shopCardsWithSprite = shopCards.map((card) => ({
          ...card,
          sprite: card.sprite,
        }));
        this.server.to(data.roomId).emit('handPlayResult', {
          hands: allHands,
          shopCards: shopCardsWithSprite,
        });
      }
    } catch (error) {
      this.logger.error(
        `[handleHandPlayReady] Error: socketId=${client.id}, data=${JSON.stringify(data)}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('error', { message: 'Failed to submit hand play' });
    }
  }

  @SubscribeMessage('nextRound')
  handleNextRound(
    @MessageBody() data: { roomId: string },
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
        client.emit('error', { message: 'User not registered' });
        return;
      }
      // 준비 상태 저장
      this.roomService.setNextRoundReady(data.roomId, userId);
      this.logger.log(
        `[handleNextRound] nextRoundReady 완료: userId=${userId}, roomId=${data.roomId}`,
      );
      // 준비한 유저를 즉시 브로드캐스트
      this.server.to(data.roomId).emit('nextRoundReady', { userId });
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
        if (room) {
          for (const socketId of room) {
            const uid = this.socketIdToUserId.get(socketId);
            if (!uid) continue;
            const myCards = this.roomService.getUserHand(data.roomId, uid);
            const opponents = this.roomService.getOpponentCardCounts(
              data.roomId,
              uid,
            );
            this.logger.log(
              `[handleNextRound] [startGame emit] to userId=${uid}, socketId=${socketId}, myCards=${JSON.stringify(myCards)}, opponents=${JSON.stringify(opponents)}`,
            );
            void this.server.to(socketId).emit('startGame', {
              myCards,
              opponents,
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `[handleNextRound] Error in nextRound/startGame: socketId=${client.id}, roomId=${data.roomId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `[handleNextRound] Error in nextRound/startGame: socketId=${client.id}, roomId=${data.roomId}`,
          String(error),
        );
      }
      client.emit('error', { message: 'Failed to start next round' });
    }
  }

  @SubscribeMessage('buyCard')
  async handleBuyCard(
    @MessageBody()
    data: { roomId: string; cardId: string; cardType: string; price: number },
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
        client.emit('error', { message: 'User not registered' });
        return;
      }

      // 구매 처리
      const result = await this.roomService.buyCard(
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
        client.emit('buyCardResult', {
          success: true,
          cardId: data.cardId,
          cardType: data.cardType,
          price: data.price,
          cardName: result.cardName,
          cardDescription: result.cardDescription,
          cardSprite: result.cardSprite,
          message: '카드 구매가 완료되었습니다.',
        });

        // 다른 유저들에게 구매 알림 (선택사항)
        client.to(data.roomId).emit('cardPurchased', {
          userId: userId,
          cardId: data.cardId,
          cardType: data.cardType,
        });
      } else {
        this.logger.warn(
          `[handleBuyCard] 구매 실패: userId=${userId}, cardId=${data.cardId}, reason=${result.message}`,
        );

        // 구매 실패 응답
        client.emit('buyCardResult', {
          success: false,
          cardId: data.cardId,
          cardType: data.cardType,
          price: data.price,
          message: result.message,
        });
      }
    } catch (error) {
      this.logger.error(
        `[handleBuyCard] Error in buyCard: socketId=${client.id}, roomId=${data.roomId}, cardId=${data.cardId}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('error', { message: 'Failed to buy card' });
    }
  }

  afterInit() {
    // WebSocket 서버 초기화 시 필요한 작업이 있으면 여기에 작성
    this.logger.log('[RoomGateway] afterInit called');
  }

  onModuleInit() {
    (
      global as unknown as { roomGatewayInstance: unknown }
    ).roomGatewayInstance = this;
    this.logger.log('[RoomGateway] 글로벌 인스턴스 등록 완료');
  }
}
