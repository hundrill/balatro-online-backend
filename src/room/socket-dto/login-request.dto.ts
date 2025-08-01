import { BaseSocketDto } from './base-socket.dto';
import { IsEmail, IsString, IsNumber } from 'class-validator';

export class LoginRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'LoginRequest';

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsNumber()
    version: number;
}
