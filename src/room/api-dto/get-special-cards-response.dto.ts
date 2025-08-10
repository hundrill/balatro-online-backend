export class GetSpecialCardsResponseDto {
    success: boolean;
    code: number;
    message: string;
    specialCards: SpecialCardApiDto[];
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

    // 조건-효과 시스템 필드들
    effectTimings: string[] | null;
    effectTypes: string[] | null;
    effectOnCards: boolean[] | null;
    conditionTypes: string[] | null;
    conditionValues: string[] | null;
    conditionOperators: string[] | null;
    conditionNumericValues: number[] | null;
} 