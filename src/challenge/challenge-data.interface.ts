export interface ChallengeData {
    id: string;
    nameKo: string;
    nameEn: string;
    nameId: string;
    nameTh: string;
    descriptionKo?: string;
    descriptionEn?: string;
    descriptionId?: string;
    descriptionTh?: string;
    targetCount: number;
    reward?: number;
    currentCount: number;
}

