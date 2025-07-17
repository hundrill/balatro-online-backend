import { BaseSocketDto } from './base-socket.dto';

export class LeaveRoomRequestDto extends BaseSocketDto {
    public readonly eventName = 'LeaveRoomRequest';

    constructor(public readonly roomId: string) {
        super();
    }
} 