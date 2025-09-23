export class ChallengeClaimResponseDto {
    success: boolean;
    code: number;
    message: string;
    reward?: number;
    goldChip?: number;
    silverChip?: number;
}
