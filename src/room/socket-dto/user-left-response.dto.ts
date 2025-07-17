import { BaseSocketDto } from "./base-socket.dto";

export class UserLeftResponseDto extends BaseSocketDto {
    override eventName = 'UserLeftResponse';
    constructor(init?: Partial<UserLeftResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
