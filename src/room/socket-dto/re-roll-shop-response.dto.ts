import { BaseSocketDto } from './base-socket.dto';
import { IsBoolean, IsArray, IsString } from 'class-validator';

export class ReRollShopResponseDto extends BaseSocketDto {
    override eventName = 'ReRollShopResponse';

    @IsArray()
    cards: any[];

    constructor(init?: Partial<ReRollShopResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
