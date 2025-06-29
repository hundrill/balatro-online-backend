import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  handleConnection(client: Socket) {
    try {
      this.logger.log(`WebSocket client connected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error handling WebSocket connection: ${client.id}`, error.stack);
    }
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`WebSocket client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error handling WebSocket disconnection: ${client.id}`, error.stack);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`WebSocket joinRoom: Client ${client.id} joining room ${data.roomId}`);
      client.join(data.roomId);

      // 방에 입장한 사용자 본인에게 성공 알림
      client.emit('userJoined', { userId: client.id });

      // 방의 다른 사용자들에게 입장 알림
      client.to(data.roomId).emit('userJoined', { userId: client.id });

      this.logger.log(`WebSocket joinRoom: Client ${client.id} successfully joined room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error in WebSocket joinRoom: Client ${client.id}, Room ${data.roomId}`, error.stack);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`WebSocket leaveRoom: Client ${client.id} leaving room ${data.roomId}`);
      client.leave(data.roomId);
      client.to(data.roomId).emit('userLeft', { userId: client.id });
      this.logger.log(`WebSocket leaveRoom: Client ${client.id} successfully left room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error in WebSocket leaveRoom: Client ${client.id}, Room ${data.roomId}`, error.stack);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`WebSocket sendMessage: Client ${client.id} sending message to room ${data.roomId}`);
      client.to(data.roomId).emit('receiveMessage', {
        userId: client.id,
        message: data.message,
      });
      this.logger.log(`WebSocket sendMessage: Message sent successfully to room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error in WebSocket sendMessage: Client ${client.id}, Room ${data.roomId}`, error.stack);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}
