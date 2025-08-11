import { BaseSocketDto } from './base-socket.dto';
import { IsBoolean, IsArray, IsString, IsNumber } from 'class-validator';

export class ReRollShopResponseDto extends BaseSocketDto {
    override responseEventName = 'ReRollShopResponse';

    @IsArray()
    cardIds: string[];

    @IsString()
    userId?: string;

    @IsNumber()
    funds?: number;

    constructor(init?: Partial<ReRollShopResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
