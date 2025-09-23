export class ChallengeStatusDataDto {
    id: string;
    currentCount: number;
    isCompleted: boolean;
}

export class ChallengeStatusResponseDto {
    success: boolean;
    code: number;
    message: string;
    challenges: ChallengeStatusDataDto[];
}
