import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CsvImporterService {
    private readonly logger = new Logger(CsvImporterService.name);

    parseToken(token: string): any {
        // count 조건이 있었는지 추적하는 변수
        let hadCountCondition = false;

        // ^ 구분자로 4개 부분으로 분리
        const parts = token.split('^');

        if (parts.length !== 4) {
            this.logger.warn(`토큰 파싱 실패: ${token} (^ 구분자로 분리된 부분이 4개가 아님: ${parts.length}개)`);
            return null;
        }

        // 4개 부분 추출
        const effectPart = parts[0];       // add_mults=2
        const effect = parts[1];           // playingcard
        const conditionPart = parts[2];    // by_suite=diamond
        const target = parts[3];           // playingcard

        // effectPart를 = 로 분해
        const effectParts = effectPart.split('=');
        if (effectParts.length !== 2) {
            this.logger.warn(`effectPart 파싱 실패: ${effectPart} (= 구분자로 분리된 부분이 2개가 아님: ${effectParts.length}개)`);
            return null;
        }

        const effectVerb = effectParts[0];  // add_mults
        const effectValueRaw = effectParts[1]; // 2*count 또는 2

        // effectValue를 * 로 파싱
        const effectValueParts = effectValueRaw.split('*');
        let effectValueData = effectValueParts[0]; // 2, [basevalue], [increase], [decrease], 2@20
        const effectByCount = effectValueParts.length > 1 && effectValueParts[1] === 'count'; // true/false

        let effectUseRandomValue = false;
        let effectValue = ['', ''];

        // if (effectValueData.includes('@')) {
        //     effectUseRandomValue = true;
        //     effectValue[0] = effectValueData.split('@')[0];
        //     effectValue[1] = effectValueData.split('@')[1];
        // }
        // else {
        //     effectValue[0] = effectValueData;
        // }
        effectValue[0] = effectValueData;

        // conditionPart를 & 로 분해
        const conditionParts = conditionPart.split('&');
        let parsedConditionValues: string[] = [];
        let conditionOperator: string = 'count';
        let countCondition = { operator: 'GreaterOrEqual', numericValue: 1 };

        for (const part of conditionParts) {
            if (part.includes('count')) {
                countCondition = this.parseCountCondition(part) || { operator: 'GreaterOrEqual', numericValue: 1 };
            }
            else {
                conditionOperator = part.split('=')[0]; // include_rank
                const conditionValues = part.split('=')[1] || ''; // triple/fullhouse/fourcard
                parsedConditionValues = this.parseConditionValues(conditionValues);
            }
        }

        // conditionOperator와 target을 조합해서 conditionType 구하기
        const conditionType = this.getConditionType(conditionOperator, target);

        // effectVerb로 effectType 구하기
        const effectType = this.getEffectType(effectVerb);

        // this.logger.log(`토큰 분해 결과:`, {
        //     parsed: {
        //         effectVerb,
        //         effectValue,
        //         effectByCount,
        //         effect,
        //         conditionPart,
        //         conditionOperator,
        //         conditionValues,
        //         target
        //     },
        //     effectType
        // });

        return {
            // parsed: {
            //     effectVerb,
            //     effectValue,
            //     effectByCount,
            //     effect,
            //     conditionPart,
            //     conditionOperator,
            //     conditionValues,
            //     target
            // },
            effectType,
            effectValue,
            effectByCount,
            effectOnCard: false,
            effectUseRandomValue,
            conditionType,
            conditionValues: parsedConditionValues,
            conditionOperatorType: countCondition?.operator,
            conditionNumericValue: countCondition?.numericValue ? [countCondition.numericValue] : []
        };
    }

    private getEffectType(effectVerb: string): string {
        switch (effectVerb) {
            case 'add_mults':
                return 'AddMultiplier';
            case 'add_chips':
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
            case 'copy_left':
                return 'CopyLeftJoker';
            default:
                this.logger.warn(`알 수 없는 effectVerb: ${effectVerb}`);
                return 'Unknown';
        }
    }

    private parseConditionValues(conditionValues: string): string[] {
        const result: string[] = [];

        // / 로 분해하여 맵핑
        const parts = conditionValues.split('/');
        const mappedParts = parts.map(part => this.mapConditionValue(part));
        result.push(...mappedParts);

        return result;
    }

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
            'onepair': 'OnePair',
            'twopair': 'TwoPair',
            'triple': 'ThreeOfAKind',
            'fourcard': 'FourOfAKind',
            'fivecard': 'FiveOfAKind',
            'fullhouse': 'FullHouse',
            'flush': 'Flush',
            'flushfive': 'StraightFlush',
            'straight': 'Straight',
            'highcard': 'HighCard'
        };

        // 매핑 시도
        if (suitMap[value]) return suitMap[value];
        if (rankMap[value]) return rankMap[value];
        if (handTypeMap[value]) return handTypeMap[value];

        // 매핑되지 않으면 원본 반환
        return value;
    }

    private parseCountCondition(conditionValues: string): { operator: string; numericValue: number } | null {

        // count=1, count>2, count>=1, count<=2, count<4 패턴 파싱
        const match = conditionValues.match(/count([<>=]*)(\d+)/);
        if (match) {
            const operator = this.mapOperator(match[1] || '=');
            const numericValue = parseInt(match[2]);
            return { operator, numericValue };
        }

        return null;
    }

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

    private getConditionType(conditionOperator: string, target: string): string {
        // nocondition은 target 상관없이 항상 Always
        if (conditionOperator === 'nocondition') {
            return 'Always';
        }

        // conditionOperator와 target 조합으로 conditionType 결정
        const key = `${conditionOperator}+${target}`;

        const conditionTypeMap: Record<string, string> = {
            'by_suite+playingcard': 'CardSuit',
            'by_suite+playcard': 'UsedSuitCount',
            'by_suite+handcard': 'UnUsedSuitCount',
            'by_number+playingcard': 'CardRank',
            'by_number+playcard': 'UsedCardCount',
            'by_number+handcard': 'UnUsedRankCount',
            'by_number+deckcardall': 'RemainingCardCount',
            'include_rank+playcard': 'HandType',
            'include_rank+handcard': 'UnUsedHandType',
            'count+remain_discard': 'RemainingDiscards',
            'count+remain_hand': 'RemainingHand',
            'count+remain_deckcard': 'RemainingDeck',
            'count+deckcardall': 'TotalDeck'
        };

        return conditionTypeMap[key] || 'Unknown';
    }
}