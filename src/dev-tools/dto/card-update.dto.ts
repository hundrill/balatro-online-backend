import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CardUpdateDto {
    @IsString()
    id: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

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