import { BaseSocketDto } from './base-socket.dto';
import { IsEmail, IsString } from 'class-validator';

export class LoginRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'LoginRequest';

    @IsEmail()
    email: string;

    @IsString()
    password: string;
}
