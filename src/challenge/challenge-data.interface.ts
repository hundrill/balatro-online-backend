export interface ChallengeData {
    id: string;
    nameKo: string;
    nameEn: string;
    nameId: string;
    descriptionKo?: string;
    descriptionEn?: string;
    descriptionId?: string;
    targetCount: number;
    reward?: number;
    currentCount: number;
}

