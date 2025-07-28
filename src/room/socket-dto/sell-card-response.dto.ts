import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsBoolean } from 'class-validator';

export class SellCardResponseDto extends BaseSocketDto {
    override responseEventName = 'SellCardResponse';

    @IsString()
    userId?: string;

    @IsString()
    soldCardId?: string;
    funds?: number;

    constructor(init?: Partial<SellCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
