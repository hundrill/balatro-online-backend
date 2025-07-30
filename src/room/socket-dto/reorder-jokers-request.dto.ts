import { BaseSocketDto } from './base-socket.dto';
import { IsArray, IsString } from 'class-validator';

export class ReorderJokersRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'ReorderJokersRequest';

    @IsArray()
    @IsString({ each: true })
    jokerIds: string[];
} 