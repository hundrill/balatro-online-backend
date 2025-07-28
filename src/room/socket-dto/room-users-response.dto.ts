import { BaseSocketDto } from "./base-socket.dto";

export class RoomUsersResponseDto extends BaseSocketDto {
    override responseEventName = 'RoomUsersResponse';
    users: any[];
    constructor(init?: Partial<RoomUsersResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
