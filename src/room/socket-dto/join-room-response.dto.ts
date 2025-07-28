import { BaseSocketDto } from "./base-socket.dto";

export class JoinRoomResponseDto extends BaseSocketDto {
    override responseEventName = 'JoinRoomResponse';
    constructor(init?: Partial<JoinRoomResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
