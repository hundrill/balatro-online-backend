import { BaseSocketDto } from './base-socket.dto';

export class JoinRoomRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'JoinRoomRequest';

    roomId: string;
    userId: string;
}