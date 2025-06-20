import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/room', cors: true })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
    handleConnection(client: Socket) {
        // 클라이언트가 소켓에 연결될 때 호출
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        // 클라이언트가 소켓에서 연결 해제될 때 호출
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
        client.join(data.roomId);
        client.to(data.roomId).emit('userJoined', { userId: client.id });
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
        client.leave(data.roomId);
        client.to(data.roomId).emit('userLeft', { userId: client.id });
    }

    @SubscribeMessage('sendMessage')
    handleSendMessage(
        @MessageBody() data: { roomId: string; message: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(data.roomId).emit('receiveMessage', {
            userId: client.id,
            message: data.message,
        });
    }
} 