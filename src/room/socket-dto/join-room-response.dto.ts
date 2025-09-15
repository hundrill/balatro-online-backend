import { BaseSocketDto } from "./base-socket.dto";
import { ChipType } from "../room.service";

export class JoinRoomResponseDto extends BaseSocketDto {
    override responseEventName = 'JoinRoomResponse';

    success: boolean = true;
    chipType?: ChipType;
    timeLimit?: number;

    constructor(init?: Partial<JoinRoomResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
