import { BaseSocketDto } from "./base-socket.dto";

export class UserLeftResponse extends BaseSocketDto {
    override eventName = 'userLeft';
    constructor(init?: Partial<UserLeftResponse>) {
        super();
        Object.assign(this, init);
    }
}
