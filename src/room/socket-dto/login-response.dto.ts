import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt } from 'class-validator';

export class LoginResponseDto extends BaseSocketDto {
    override eventName = 'loginResult';

    @IsString()
    email: string;

    @IsString()
    nickname: string;

    @IsInt()
    silverChip: number;

    @IsInt()
    goldChip: number;

    @IsString()
    createdAt: string;

    constructor(init?: Partial<LoginResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
