import { BaseSocketDto } from './base-socket.dto';

export class JoinRoomRequestDto extends BaseSocketDto {
    public readonly eventName = 'JoinRoomRequest';

    constructor(
        public readonly roomId: string,
        public readonly userId: string,
    ) {
        super();
    }
} 