import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsBoolean } from 'class-validator';

export class SellCardResponseDto extends BaseSocketDto {
    override eventName = 'SellCardResponse';

    @IsString()
    soldCardName?: string;

    constructor(init?: Partial<SellCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
