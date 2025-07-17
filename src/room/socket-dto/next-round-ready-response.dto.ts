import { BaseSocketDto } from "./base-socket.dto";

export class NextRoundReadyResponseDto extends BaseSocketDto {
    override eventName = 'NextRoundReadyResponse';
    userId: string;
    constructor(init?: Partial<NextRoundReadyResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
