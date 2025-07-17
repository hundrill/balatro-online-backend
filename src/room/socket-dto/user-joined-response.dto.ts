import { BaseSocketDto } from "./base-socket.dto";

export class UserJoinedResponseDto extends BaseSocketDto {
    override eventName = 'UserJoinedResponse';
    userId: string;
    constructor(init?: Partial<UserJoinedResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
