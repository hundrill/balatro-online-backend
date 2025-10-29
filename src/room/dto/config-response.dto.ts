export class ConfigResponseDto {
    success: boolean;
    code: number;
    message: string;
    specialCards: SpecialCardApiDto[];
    challenges: ChallengeApiDto[];
    channelSeedMoney: ChannelSeedMoneyDto;
}

export class ChannelSeedMoneyDto {
    beginner: SeedMoneyDataDto;
    intermediate: SeedMoneyDataDto;
    advanced: SeedMoneyDataDto;
    expert: SeedMoneyDataDto;
    royal: SeedMoneyDataDto;
}

export class SeedMoneyDataDto {
    seedMoney1: number;
    seedMoney2: number;
    seedMoney3: number;
    seedMoney4: number;
}

export class SpecialCardApiDto {
    id: string;
    name: string;
    description: string | null;
    price: number;
    sprite: number;
    type: string;
    baseValue: number | null;
    increase: number | null;
    decrease: number | null;
    maxValue: number | null;
    needCardCount: number | null;
    enhanceChips: number | null;
    enhanceMul: number | null;
    isActive: boolean;

    conditionTypes: string[] | null;
    conditionValues: string[][] | null;
    conditionOperators: string[] | null;
    conditionNumericValues: number[] | null;

    effectTimings: string[] | null;
    effectTypes: string[] | null;
    effectOnCards: boolean[] | null;
    effectValues: string[][] | null;
    effectByCounts: boolean[] | null;
}

export class ChallengeApiDto {
    id: string;
    nameKo: string;
    nameEn: string;
    nameId: string;
    nameTh: string;
    descriptionKo: string | null;
    descriptionEn: string | null;
    descriptionId: string | null;
    descriptionTh: string | null;
    targetCount: number;
    reward: number | null;
    currentCount: number;
}