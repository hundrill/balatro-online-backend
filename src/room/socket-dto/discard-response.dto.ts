import { BaseSocketDto } from './base-socket.dto';
import { IsInt, IsArray } from 'class-validator';

export class DiscardResponseDto extends BaseSocketDto {
    override eventName = 'DiscardResponse';

    @IsArray()
    newHand: any[];

    @IsArray()
    discarded: any[];

    @IsInt()
    remainingDiscards: number;

    constructor(init?: Partial<DiscardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
