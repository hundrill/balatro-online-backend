import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CardUpdateDto {
    @IsString()
    id: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    descriptionKo?: string;

    @IsString()
    @IsOptional()
    descriptionId?: string;

    @IsString()
    @IsOptional()
    descriptionEn?: string;

    @IsNumber()
    @IsOptional()
    price?: number;

    @IsNumber()
    @IsOptional()
    sprite?: number;

    @IsNumber()
    @IsOptional()
    baseValue?: number;

    @IsNumber()
    @IsOptional()
    increase?: number;

    @IsNumber()
    @IsOptional()
    decrease?: number;

    @IsNumber()
    @IsOptional()
    maxValue?: number;

    // 2개 고정 조건-효과 시스템 필드들
    // 첫 번째 조건-효과 쌍
    @IsString()
    @IsOptional()
    conditionType1?: string;

    @IsString()
    @IsOptional()
    conditionValue1?: string;

    @IsString()
    @IsOptional()
    conditionOperator1?: string;

    @IsNumber()
    @IsOptional()
    conditionNumeric1?: number;

    @IsString()
    @IsOptional()
    effectTiming1?: string;

    @IsString()
    @IsOptional()
    effectType1?: string;

    @IsString()
    @IsOptional()
    effectTarget1?: string;

    // 두 번째 조건-효과 쌍
    @IsString()
    @IsOptional()
    conditionType2?: string;

    @IsString()
    @IsOptional()
    conditionValue2?: string;

    @IsString()
    @IsOptional()
    conditionOperator2?: string;

    @IsNumber()
    @IsOptional()
    conditionNumeric2?: number;

    @IsString()
    @IsOptional()
    effectTiming2?: string;

    @IsString()
    @IsOptional()
    effectType2?: string;

    @IsString()
    @IsOptional()
    effectTarget2?: string;

    // 기존 필드들 (하위 호환성 유지)
    @IsString()
    @IsOptional()
    timing_draw?: string;

    @IsString()
    @IsOptional()
    timing_round_start?: string;

    @IsString()
    @IsOptional()
    timing_hand_play?: string;

    @IsString()
    @IsOptional()
    timing_scoring?: string;

    @IsString()
    @IsOptional()
    timing_after_scoring?: string;

    @IsString()
    @IsOptional()
    timing_fold?: string;

    @IsString()
    @IsOptional()
    timing_round_clear?: string;

    @IsString()
    @IsOptional()
    timing_tarot_card_use?: string;

    @IsString()
    @IsOptional()
    timing_planet_card_use?: string;

    @IsNumber()
    @IsOptional()
    needCardCount?: number;

    @IsNumber()
    @IsOptional()
    enhanceChips?: number;

    @IsNumber()
    @IsOptional()
    enhanceMul?: number;

    @IsOptional()
    isActive?: boolean;
}

export class ChipRechargeDto {
    @IsNumber()
    silverChips: number;

    @IsString()
    userSelect: string;
} 