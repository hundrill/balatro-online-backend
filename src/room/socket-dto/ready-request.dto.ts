import { BaseSocketDto } from './base-socket.dto';
import { IsString } from 'class-validator';

export class ReadyRequestDto extends BaseSocketDto {
    @IsString()
    roomId: string;
}
