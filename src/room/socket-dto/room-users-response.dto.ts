import { BaseSocketDto } from "./base-socket.dto";

export class RoomUsersResponseDto extends BaseSocketDto {
    override eventName = 'RoomUsersResponse';
    users: any[];
    constructor(init?: Partial<RoomUsersResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
