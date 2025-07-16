import { BaseSocketDto } from "./base-socket.dto";

export class UserJoinedResponse extends BaseSocketDto {
    override eventName = 'userJoined';
    userId: string;
    constructor(init?: Partial<UserJoinedResponse>) {
        super();
        Object.assign(this, init);
    }
}
