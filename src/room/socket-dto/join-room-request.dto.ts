import { BaseSocketDto } from './base-socket.dto';

export class JoinRoomRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'JoinRoomRequest';

    roomId: string;
    userId: string;
}