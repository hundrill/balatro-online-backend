import { BaseSocketDto } from './base-socket.dto';
import { IsEmail, IsString } from 'class-validator';

export class LoginRequestDto extends BaseSocketDto {
    // @IsEmail()
    email: string;

    // @IsString()
    password: string;
}
