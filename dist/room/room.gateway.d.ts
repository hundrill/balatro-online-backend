import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
export declare class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(data: {
        roomId: string;
    }, client: Socket): void;
    handleLeaveRoom(data: {
        roomId: string;
    }, client: Socket): void;
    handleSendMessage(data: {
        roomId: string;
        message: string;
    }, client: Socket): void;
}
