import { BaseSocketDto } from "./base-socket.dto";

export class ErrorResponse extends BaseSocketDto {
    override eventName = 'error';
    constructor(init?: Partial<ErrorResponse>) {
        super();
        Object.assign(this, init);
    }
}
