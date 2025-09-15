export class LoginResponseDto {
    success: boolean;
    code: number;
    message: string;
    token?: string;
    userId?: string;
    nickname?: string;
    silverChip?: number;
    goldChip?: number;
    createdAt?: string;
}