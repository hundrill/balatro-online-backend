import { BaseSocketDto } from "./base-socket.dto";

export class LeaveRoomResponseDto extends BaseSocketDto {
    override responseEventName = 'LeaveRoomResponse';
    constructor(init?: Partial<LeaveRoomResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
