import { BaseSocketDto } from "./base-socket.dto";

export class RoomUsersResponse extends BaseSocketDto {
    override eventName = 'roomUsers';
    users: any[];
    constructor(init?: Partial<RoomUsersResponse>) {
        super();
        Object.assign(this, init);
    }
}
