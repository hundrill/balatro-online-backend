import { BaseSocketDto } from "./base-socket.dto";

export class ErrorResponseDto extends BaseSocketDto {
    override eventName = 'ErrorResponse';
    constructor(init?: Partial<ErrorResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
