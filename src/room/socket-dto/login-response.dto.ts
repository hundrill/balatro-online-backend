import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt, IsArray, IsOptional } from 'class-validator';

export class LoginResponseDto extends BaseSocketDto {
    override responseEventName = 'LoginResponse';

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

    @IsOptional()
    @IsArray()
    specialCards?: any[];

    constructor(init?: Partial<LoginResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
