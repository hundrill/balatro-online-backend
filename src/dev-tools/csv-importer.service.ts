import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CsvImporterService {
    private readonly logger = new Logger(CsvImporterService.name);

    // parseToken(token: string): any {
    //     // count 조건이 있었는지 추적하는 변수
    //     let hadCountCondition = false;

    //     // ^ 구분자로 4개 부분으로 분리
    //     const parts = token.split('^');

    //     if (parts.length !== 4) {
    //         this.logger.warn(`토큰 파싱 실패: ${token} (^ 구분자로 분리된 부분이 4개가 아님: ${parts.length}개)`);
    //         return null;
    //     }

    //     // 4개 부분 추출
    //     const effectPart = parts[0];       // add_mults=2
    //     const effect = parts[1];           // playingcard
    //     const conditionPart = parts[2];    // by_suite=diamond
    //     const target = parts[3];           // playingcard

    //     // effectPart를 = 로 분해
    //     const effectParts = effectPart.split('=');
    //     if (effectParts.length !== 2) {
    //         this.logger.warn(`effectPart 파싱 실패: ${effectPart} (= 구분자로 분리된 부분이 2개가 아님: ${effectParts.length}개)`);
    //         return null;
    //     }

    //     const effectVerb = effectParts[0];  // add_mults
    //     const effectValueRaw = effectParts[1]; // 2*count 또는 2

    //     // effectValue를 * 로 파싱
    //     const effectValueParts = effectValueRaw.split('*');
    //     let effectValueData = effectValueParts[0]; // 2, [basevalue], [increase], [decrease], 2@20
    //     const effectByCount = effectValueParts.length > 1 && effectValueParts[1] === 'count'; // true/false

    //     let effectUseRandomValue = false;
    //     let effectValue = ['', ''];

    //     // if (effectValueData.includes('@')) {
    //     //     effectUseRandomValue = true;
    //     //     effectValue[0] = effectValueData.split('@')[0];
    //     //     effectValue[1] = effectValueData.split('@')[1];
    //     // }
    //     // else {
    //     //     effectValue[0] = effectValueData;
    //     // }
    //     effectValue[0] = effectValueData;

    //     // conditionPart를 & 로 분해
    //     const conditionParts = conditionPart.split('&');
    //     let parsedConditionValues: string[] = [];
    //     let conditionOperator: string = 'count';
    //     let countCondition = { operator: 'GreaterOrEqual', numericValue: 1 };

    //     for (const part of conditionParts) {
    //         if (part.includes('count')) {
    //             countCondition = this.parseCountCondition(part) || { operator: 'GreaterOrEqual', numericValue: 1 };
    //         }
    //         else {
    //             conditionOperator = part.split('=')[0];
    //             const conditionValues = part.split('=')[1] || ''; // triple/fullhouse/fourcard
    //             parsedConditionValues = this.parseConditionValues(conditionValues);
    //         }
    //     }

    //     // conditionOperator와 target을 조합해서 conditionType 구하기
    //     const conditionType = this.getConditionType(conditionOperator, target);

    //     // effectVerb로 effectType 구하기
    //     const effectType = this.mapEffectType(effectVerb);

    //     // this.logger.log(`토큰 분해 결과:`, {
    //     //     parsed: {
    //     //         effectVerb,
    //     //         effectValue,
    //     //         effectByCount,
    //     //         effect,
    //     //         conditionPart,
    //     //         conditionOperator,
    //     //         conditionValues,
    //     //         target
    //     //     },
    //     //     effectType
    //     // });

    //     return {
    //         // parsed: {
    //         //     effectVerb,
    //         //     effectValue,
    //         //     effectByCount,
    //         //     effect,
    //         //     conditionPart,
    //         //     conditionOperator,
    //         //     conditionValues,
    //         //     target
    //         // },
    //         effectType,
    //         effectValue,
    //         effectByCount,
    //         effectOnCard: false,
    //         effectUseRandomValue,
    //         conditionType,
    //         conditionValues: parsedConditionValues,
    //         conditionOperatorType: countCondition?.operator,
    //         conditionNumericValue: countCondition?.numericValue ? [countCondition.numericValue] : []
    //     };
    // }

    parseToken2(effect: string): any {

        this.logger.log(`[DevTools] parseToken2 invoked with effect: ${effect}`);

        const parts = effect.split('^');

        if (parts.length < 2 || parts.length > 3) {
            this.logger.warn(`새 토큰 파싱 실패: ${effect} (^ 구분자로 분리된 부분이 2개 또는 3개가 아님: ${parts.length}개)`);
            return null;
        }

        let basevalue = 0;
        let increase = 0;
        let decrease = 0;
        let maxvalue = 0;

        const conditionPart = parts[0];
        const effectPart = parts[1];
        const timingPart = parts[2] ?? '';

        const operatorPriority = ['!=', '>=', '<=', '>', '<', '='];

        let conditionType = 'Unknown';
        const conditionValues: string[] = [];
        const conditionNumericValue: number[] = [];
        let conditionOperatorType: string | null = null;
        let timingKeyword = 'timing_scoring';

        const trimmed = conditionPart.trim();

        let keyword = trimmed;
        let operatorSymbol = '';
        let conditionValue = '';

        for (const op of operatorPriority) {
            const index = trimmed.indexOf(op);
            if (index > -1) {
                operatorSymbol = op;
                keyword = trimmed.substring(0, index).trim();
                conditionValue = trimmed.substring(index + op.length).trim();
                break;
            }
        }

        conditionType = this.mapConditionType(keyword);

        const conditionValueParts = conditionValue.split('/').map(part => part.trim()).filter(part => part.length > 0);
        if (conditionValueParts.length > 0) {
            for (const part of conditionValueParts) {

                if (keyword.includes('include_rank')) {

                    conditionValues.push(this.mapConditionValue(part.toLowerCase()));

                    if (part === 'onepair') {
                        conditionValues.push(this.mapConditionValue('twopair'));
                        conditionValues.push(this.mapConditionValue('triple'));
                        conditionValues.push(this.mapConditionValue('fourcard'));
                        conditionValues.push(this.mapConditionValue('fullhouse'));
                    }
                    else if (part === 'triple') {
                        conditionValues.push(this.mapConditionValue('fourcard'));
                        conditionValues.push(this.mapConditionValue('fullhouse'));
                    }
                    else if (part === 'straight') {
                        conditionValues.push(this.mapConditionValue('straightflush'));
                    }
                    else if (part === 'flush') {
                        conditionValues.push(this.mapConditionValue('straightflush'));
                    }
                }
                else {
                    const mapped = this.mapConditionValue(part.toLowerCase());
                    conditionValues.push(mapped);
                    // const numericCandidate = Number(part);
                    // if (!Number.isNaN(numericCandidate)) {
                    //     conditionNumericValue.push(numericCandidate);
                    // }
                }
            }

            if (operatorSymbol) {
                conditionOperatorType = this.mapOperator(operatorSymbol);
            }
        }

        if (timingPart.trim()) {
            timingKeyword = timingPart.trim();
        }

        this.logger.log(`[DevTools] conditionType: ${conditionType}, conditionValues: ${JSON.stringify(conditionValues)}, conditionOperatorType: ${conditionOperatorType}, basevalue: ${basevalue}, increase: ${increase}, decrease: ${decrease}, maxvalue: ${maxvalue}`);


        let effectByCount = false;
        let effectUseRandomValue = false;
        const effectValue: string[] = [];

        const effectParts = effectPart.split('=');
        const effectType = this.mapEffectType(effectParts[0]?.trim() ?? '');
        if (effectParts[0]?.trim().includes('by_count')) {
            effectByCount = true;
        }

        if (effectParts.length > 1) {
            let rawEffectValue = effectParts.slice(1).join('=').trim();

            if (rawEffectValue.length > 0) {

                if (rawEffectValue.includes('@')) {
                    effectUseRandomValue = true;
                    effectValue.push(
                        ...rawEffectValue
                            .split('@')
                            .map(part => part.trim())
                            .filter(part => part.length > 0)
                    );
                } else {
                    effectValue.push(rawEffectValue);

                    if (effectType === 'GrowBaseValue') {
                        increase = parseFloat(rawEffectValue);
                    } else if (effectType === 'DecrementBaseValue') {
                        decrease = parseFloat(rawEffectValue);
                    } else {
                        basevalue = parseFloat(rawEffectValue);
                    }
                }
            }
        }

        this.logger.log(`[DevTools] effectType: ${effectType}, effectValue: ${JSON.stringify(effectValue)}, effectByCount: ${effectByCount}, effectUseRandomValue: ${effectUseRandomValue}`);

        return {
            conditionType,
            conditionValues,
            conditionOperatorType,
            conditionNumericValue,
            effectType,
            effectValue,
            effectByCount,
            effectOnCard: false,
            effectUseRandomValue
        };
    }

    private mapEffectType(effectVerb: string): string {
        switch (effectVerb) {
            case 'add_mults':
            case 'add_mults_by_count':
                return 'AddMultiplier';
            case 'add_chips':
            case 'add_chips_by_count':
                return 'AddChips';
            case 'multiple_mults':
                return 'MulMultiplier';
            case 'multiple_chips':
                return 'MulChips';
            case 'increase_chips':
                return 'GrowCardChips';
            case 'increase_mults':
                return 'GrowCardMultiplier';
            case 'increase_basevalue':
                return 'GrowBaseValue';
            case 'decrease_basevalue':
                return 'DecrementBaseValue';
            case 'subtract_chips':
                return 'SubtractChips';
            case 'copy_left_joker':
                return 'CopyLeftJoker';
            default:
                this.logger.warn(`알 수 없는 effectVerb: ${effectVerb}`);
                return 'Unknown';
        }
    }

    private mapConditionType(keyword: string): string {
        const map: Record<string, string> = {
            'scoring_card_by_suite': 'CardSuit',
            'scoring_card_by_number': 'CardRank',
            'handplay_used_card_by_rank': 'HandType',
            'handplay_used_card_include_rank': 'HandType',
            'handplay_used_card_by_suite': 'UsedSuitCount',
            'handplay_unused_card_include_rank': 'UnUsedHandType',
            'handplay_unused_card_by_suite': 'UnUsedSuitCount',
            'other_handplay_used_card_include_rank': 'OtherHandTypeCount',
            'other_handplay_used_card_by_suite': 'OtherUsedSuitCount',
            'deck_card_by_number': 'RemainingCardCount',
            'deck_card_remain': 'RemainingDeck',
            'remain_discard': 'RemainingDiscards',
            'redraw_card_by_suite': 'RedrawCardSuit',
            'discard_card_by_suite': 'DiscardCardSuit',
            'no_condition': 'Always',
        };
        return map[keyword] ?? 'Unknown';
    }


    // private parseConditionValues(conditionValues: string): string[] {
    //     const result: string[] = [];

    //     // / 로 분해하여 맵핑
    //     const parts = conditionValues.split('/');
    //     const mappedParts = parts.map(part => this.mapConditionValue(part));
    //     result.push(...mappedParts);

    //     return result;
    // }

    private mapConditionValue(value: string): string {
        // 무늬 매핑
        const suitMap: Record<string, string> = {
            'diamond': 'Diamonds',
            'heart': 'Hearts',
            'spade': 'Spades',
            'club': 'Clubs'
        };

        // 숫자 매핑
        const rankMap: Record<string, string> = {
            '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
            '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
            '11': '11', '12': '12', '13': '13'
        };

        // 족보 매핑
        const handTypeMap: Record<string, string> = {
            'highcard': 'HighCard',
            'onepair': 'OnePair',
            'twopair': 'TwoPair',
            'triple': 'ThreeOfAKind',
            'straight': 'Straight',
            'flush': 'Flush',
            'fullhouse': 'FullHouse',
            'fourcard': 'FourOfAKind',
            'straightflush': 'StraightFlush',
        };

        // 매핑 시도
        if (suitMap[value]) return suitMap[value];
        if (rankMap[value]) return rankMap[value];
        if (handTypeMap[value]) return handTypeMap[value];

        // 매핑되지 않으면 원본 반환
        return value;
    }

    // private parseCountCondition(conditionValues: string): { operator: string; numericValue: number } | null {

    //     // count=1, count>2, count>=1, count<=2, count<4 패턴 파싱
    //     const match = conditionValues.match(/count([<>=]*)(\d+)/);
    //     if (match) {
    //         const operator = this.mapOperator(match[1] || '=');
    //         const numericValue = parseInt(match[2]);
    //         return { operator, numericValue };
    //     }

    //     return null;
    // }

    private mapOperator(operator: string): string {
        const operatorMap: Record<string, string> = {
            '=': 'Equals',
            '>': 'Greater',
            '>=': 'GreaterOrEqual',
            '<': 'Less',
            '<=': 'LessOrEqual'
        };
        return operatorMap[operator] || 'Equals';
    }
}