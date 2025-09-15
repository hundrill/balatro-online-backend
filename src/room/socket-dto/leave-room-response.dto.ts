import { BaseSocketDto } from "./base-socket.dto";

export class LeaveRoomResponseDto extends BaseSocketDto {
    override responseEventName = 'LeaveRoomResponse';
    silverChip: number = 0;
    goldChip: number = 0;
    isKickOuted: boolean = false;

    constructor(init?: Partial<LeaveRoomResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
