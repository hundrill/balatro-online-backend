import { BaseSocketDto } from './base-socket.dto';

export class LeaveRoomRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'LeaveRoomRequest';
} 