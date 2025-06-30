import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { RoomService } from './room.service';
// import { Card } from './deck.util'; // 사용하지 않으므로 주석 처리

@WebSocketGateway({ cors: true })
export class RoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  server: Server;

  // socketId <-> userId 매핑용 Map 추가
  private socketIdToUserId: Map<string, string> = new Map();

  constructor(private readonly roomService: RoomService) { }

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
      if (userId) {
        await Promise.resolve(this.roomService.removeUserFromAllRooms(userId));
        this.logger.log(
          `[handleDisconnect] removeUserFromAllRooms called for userId=${userId}`,
        );
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
      client.emit('userJoined', { userId: data.userId });
      client.to(data.roomId).emit('userJoined', { userId: data.userId });
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
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.socketIdToUserId.get(client.id);
      this.logger.log(
        `[handleLeaveRoom] leaveRoom: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}, payload=${JSON.stringify(data)}`,
      );
      void client.leave(data.roomId);
      if (userId) {
        void client.to(data.roomId).emit('userLeft', { userId });
        void this.roomService.removeUserFromRoom(data.roomId, userId);
        this.logger.log(
          `[handleLeaveRoom] leaveRoom SUCCESS: socketId=${client.id}, userId=${userId}, roomId=${data.roomId}`,
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
  async handleReady(
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
      await Promise.resolve(this.roomService.setReady(data.roomId, userId));
      this.logger.log(
        `[handleReady] setReady 완료: userId=${userId}, roomId=${data.roomId}`,
      );
      if (await Promise.resolve(this.roomService.canStart(data.roomId))) {
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
            const opponents = this.roomService.getOpponentCardCounts(
              data.roomId,
              uid,
            );
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

  onModuleInit() {
    (
      global as unknown as { roomGatewayInstance: unknown }
    ).roomGatewayInstance = this;
    this.logger.log('[RoomGateway] 글로벌 인스턴스 등록 완료');
  }
}
