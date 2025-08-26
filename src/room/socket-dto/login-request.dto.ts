import { BaseSocketDto } from './base-socket.dto';
import { IsEmail, IsString, IsNumber, IsOptional } from 'class-validator';

export class LoginRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'LoginRequest';

    @IsString()
    userId: string;

    @IsString()
    password: string;

    @IsNumber()
    version: number;

    @IsOptional()
    @IsString()
    language?: string;
}
