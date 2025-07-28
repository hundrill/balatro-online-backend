import { BaseSocketDto } from './base-socket.dto';
import { IsArray, IsString } from 'class-validator';

export class ReorderJokersResponseDto extends BaseSocketDto {
    override responseEventName = 'ReorderJokersResponse';

    @IsString()
    userId: string;

    @IsArray()
    @IsString({ each: true })
    jokerIds: string[];

    constructor(init?: Partial<ReorderJokersResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 