import { BaseSocketDto } from "./base-socket.dto";

export class NextRoundReadyResponse extends BaseSocketDto {
    override eventName = 'nextRoundReady';
    userId: string;
    constructor(init?: Partial<NextRoundReadyResponse>) {
        super();
        Object.assign(this, init);
    }
}
