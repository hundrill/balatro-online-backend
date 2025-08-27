import { BaseSocketDto } from "./base-socket.dto";

export class StartGameResponseDto extends BaseSocketDto {
    override responseEventName = 'StartGameResponse';
    userId: string;
    constructor(init?: Partial<StartGameResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
