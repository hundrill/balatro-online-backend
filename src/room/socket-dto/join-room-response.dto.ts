import { BaseSocketDto } from "./base-socket.dto";

export class JoinRoomResponseDto extends BaseSocketDto {
    override responseEventName = 'JoinRoomResponse';

    success: boolean = true;

    constructor(init?: Partial<JoinRoomResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
