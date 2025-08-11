import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SpecialCardData } from '../special-card-manager.service';

// 게임 설정값들을 위한 인터페이스
export interface GameSettings {
    // 버리기 남은 횟수에 따른 지급 funds 값 (단일 고정값)
    discardRemainingFunds: number;
}

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

    constructor(init?: Partial<LoginResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
