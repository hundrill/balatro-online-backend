// 조커 카드 데이터 타입 정의
export interface JokerCard {
    id: string;
    name: string;
    description: string;
    price: number;
    sprite: number;
}

// 행성 카드 데이터 타입 정의
export interface PlanetCard {
    id: string;
    name: string;
    description: string;
    price: number;
    sprite: number;
}

// 타로 카드 데이터 타입 정의
export interface TarotCard {
    id: string;
    name: string;
    description: string;
    price: number;
    sprite: number;
}

// 전체 조커 카드 리스트 (다크워든 csv 기반)
export const ALL_JOKER_CARDS: JokerCard[] = [
    {
        id: 'joker_1',
        name: '조커 A',
        description: '다이아몬드로 득점 시마다 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 0,
    },
    {
        id: 'joker_2',
        name: '조커 B',
        description:
            '내 플레이 카드에 페어가 포함되어있으면 배수 <color=red>+2</color> 한다.',
        price: 3,
        sprite: 1,
    },
    {
        id: 'joker_3',
        name: '조커 C',
        description:
            '원페어 시 <color=red>x[basevalue]</color>배. 원페어가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 5,
        sprite: 2,
    },
    {
        id: 'joker_4',
        name: '조커 D',
        description:
            '투페어 시 <color=red>x[basevalue]</color>배. 투페어가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 3,
    },
    {
        id: 'joker_5',
        name: '조커 E',
        description:
            '트리플 시 <color=red>x[basevalue]</color>배. 트리플이 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 4,
    },
    {
        id: 'joker_6',
        name: '조커 F',
        description:
            '포카드 시 <color=red>x[basevalue]</color>배. 포카드가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 5,
    },
    {
        id: 'joker_7',
        name: '조커 G',
        description:
            '풀하우스 시 <color=red>x[basevalue]</color>배. 풀하우스가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 6,
    },
    {
        id: 'joker_8',
        name: '조커 H',
        description:
            '하이카드 시 <color=red>x[basevalue]</color>배. 하이카드가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 7,
    },
    {
        id: 'joker_9',
        name: '조커 I',
        description:
            '스트레이트 시 <color=red>x[basevalue]</color>배. 스트레이트가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 8,
    },
    {
        id: 'joker_10',
        name: '조커 J',
        description:
            '플러시 시 <color=red>x[basevalue]</color>배. 플러시가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 9,
    },
    {
        id: 'joker_11',
        name: '조커 K',
        description:
            '핸드플레이 시, 내 핸드에 페어가 남아있으면 배수 <color=red>3배</color>한다.',
        price: 4,
        sprite: 10,
    },
    {
        id: 'joker_12',
        name: '조커 M',
        description:
            '핸드플레이 시, 내 핸드에 트리플이 남아있으면 배수 <color=red>6배</color>한다.',
        price: 4,
        sprite: 11,
    },
    {
        id: 'joker_13',
        name: '조커 N',
        description:
            '핸드플레이 시, 내 핸드에 포 카드가 남아있으면 배수 <color=red>25배</color>한다.',
        price: 4,
        sprite: 12,
    },
    {
        id: 'joker_14',
        name: '조커 O',
        description:
            '내 패에 스트레이트가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 13,
    },
    {
        id: 'joker_15',
        name: '조커 P',
        description: '무조건 배수 <color=red>+1</color> 한다.',
        price: 4,
        sprite: 14,
    },
    {
        id: 'joker_16',
        name: '조커 Q',
        description:
            '내 패에 트리플이 포함되어있으면 배수 <color=red>+3</color> 한다.',
        price: 4,
        sprite: 15,
    },
    {
        id: 'joker_17',
        name: '조커 R',
        description:
            '내 패에 포카드가 포함되어있으면 배수 <color=red>+5</color> 한다.',
        price: 4,
        sprite: 16,
    },
    {
        id: 'joker_18',
        name: '조커 S',
        description:
            '내 패에 풀하우스가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 17,
    },
    {
        id: 'joker_19',
        name: '조커 T',
        description:
            '내 패에 플러시가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 18,
    },
    {
        id: 'joker_20',
        name: '조커 U',
        description:
            '하트로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 19,
    },
    {
        id: 'joker_21',
        name: '조커 V',
        description:
            '스페이드로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 20,
    },
    {
        id: 'joker_22',
        name: '조커 W',
        description:
            '클럽으로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 21,
    },
    {
        id: 'joker_23',
        name: '조커 X',
        description:
            '핸드플레이 시, 내 핸드에 하트가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 22,
    },
    {
        id: 'joker_24',
        name: '조커 Y',
        description:
            '핸드플레이 시, 내 핸드에 스페이드가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 23,
    },
    {
        id: 'joker_25',
        name: '조커 Z',
        description:
            '핸드플레이 시, 내 핸드에 클럽이 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 24,
    },
    {
        id: 'joker_26',
        name: '조커 AA',
        description:
            '핸드플레이 시, 내 핸드에 다이아몬드가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 25,
    },
    {
        id: 'joker_27',
        name: '조커 AB',
        description:
            '득점에 사용된 에이스 한 장당, 칩스 <color=red>+20</color> 배수 <color=blue>+4</color> 된다.',
        price: 4,
        sprite: 26,
    },
    {
        id: 'joker_28',
        name: '조커 AC',
        description:
            '배수 <color=red>+[basevalue]</color>. 라운드 종료 시 마다 배수가 <color=blue>-[decrease]</color> 된다.',
        price: 4,
        sprite: 27,
    },
    {
        id: 'joker_29',
        name: '조커 AD',
        description:
            '득점한 모든 카드의 득점 시 칩스가 <color=green>+3</color> 성장한다.',
        price: 4,
        sprite: 28,
    },
    {
        id: 'joker_30',
        name: '조커 AE',
        description:
            '전체 덱에 보유한 7 한장 당 배수가 <color=red>+2</color> 된다.',
        price: 4,
        sprite: 29,
    },
    {
        id: 'joker_31',
        name: '조커 AF',
        description:
            '전체 덱카드가 52장 보다 적으면, 그 차이 당 배수가 <color=red>+4</color> 된다.',
        price: 4,
        sprite: 30,
    },
    {
        id: 'joker_32',
        name: '조커 AG',
        description:
            '스페이드 카드로 득점 시 배수 <color=red>x[basevalue]</color> 스페이드 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 31,
    },
    {
        id: 'joker_33',
        name: '조커 AH',
        description:
            '다이아 카드로 득점 시 배수 <color=red>x[basevalue]</color> 다이아 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 32,
    },
    {
        id: 'joker_34',
        name: '조커 AI',
        description:
            '하트 카드로 득점 시 배수 <color=red>x[basevalue]</color> 하트 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 33,
    },
    {
        id: 'joker_35',
        name: '조커 AJ',
        description:
            '클럽 카드로 득점 시 배수 <color=red>x[basevalue]</color> 클럽 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 34,
    },
    {
        id: 'joker_36',
        name: '조커 AK',
        description:
            '스페이드 1장으로 플레이 시, 칩스 <color=red>x20</color> 된다.',
        price: 4,
        sprite: 35,
    },
    {
        id: 'joker_37',
        name: '조커 AL',
        description:
            '다이아몬드 4장으로 득점 시, 배수 <color=red>x12</color> 된다.',
        price: 4,
        sprite: 36,
    },
    {
        id: 'joker_38',
        name: '조커 AM',
        description: '하트 2장으로 득점 시, 배수 <color=red>x18</color> 된다.',
        price: 4,
        sprite: 37,
    },
    {
        id: 'joker_39',
        name: '조커 AN',
        description: '클럽 3장으로 득점 시, 칩스 <color=red>x15</color> 된다.',
        price: 4,
        sprite: 38,
    },
    {
        id: 'joker_40',
        name: '조커 AO',
        description:
            '왼쪽 조커와 동일한 기능을 한다. (레벨은 자신의 레벨로 적용된다.)',
        price: 4,
        sprite: 39,
    },
    {
        id: 'joker_41',
        name: '조커 AP',
        description: '남은 버리기 1 당 칩스가 <color=red>+20</color> 된다.',
        price: 5,
        sprite: 40,
    },
    {
        id: 'joker_42',
        name: '조커 AQ',
        description:
            '남은 핸드플레이 1 당 배수가 <color=red>+2</color>, 칩스는 <color=blue>-30</color> 된다.',
        price: 5,
        sprite: 41,
    },
    {
        id: 'joker_43',
        name: '조커 AR',
        description: '버리기가 0번 남았을 때 배수가 <color=red>+15</color> 된다.',
        price: 5,
        sprite: 42,
    },
    {
        id: 'joker_44',
        name: '조커 AS',
        description: '랜덤으로 배수가 <color=red>+2 ~ 20</color> 된다.',
        price: 5,
        sprite: 43,
    },
    {
        id: 'joker_45',
        name: '조커 AU',
        description: '짝수 카드 점수 시 마다, 배수 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 44,
    },
    {
        id: 'joker_46',
        name: '조커 AV',
        description: '홀수 카드 점수 시 마다, 배수 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 45,
    },
    {
        id: 'joker_47',
        name: '조커 AW',
        description:
            '덱에 남아 있는 카드 1장 당 칩스가 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 46,
    },
];

// 전체 행성 카드 리스트 (다크워든 Card_Planet.cs 기반)
export const ALL_PLANET_CARDS: PlanetCard[] = [
    {
        id: 'planet_1',
        name: '태양',
        description:
            '(Lv.1)<color=#F08D00>태양 카드</color> 획득(즉시)\n획득시점.\n <color=red>+1 </color> 배수 \n<color=#206BE3>+10 </color> 칩스',
        price: 3,
        sprite: 0,
    },
    {
        id: 'planet_2',
        name: '수성',
        description:
            '(Lv.1)<color=#F08D00>수성</color> 획득(즉시)\n획득시점.\n <color=red>+1 </color> 배수 \n<color=#206BE3>+15 </color> 칩스',
        price: 3,
        sprite: 1,
    },
    {
        id: 'planet_3',
        name: '금성',
        description:
            '(Lv.1)<color=#F08D00>금성 카드</color> 획득(즉시)\n획득시점.\n <color=red>+1 </color> 배수 \n<color=#206BE3>+20 </color> 칩스',
        price: 3,
        sprite: 2,
    },
    {
        id: 'planet_4',
        name: '지구',
        description:
            '(Lv.1)<color=#F08D00>지구</color> 획득(즉시)\n획득시점.\n <color=red>+2 </color> 배수 \n<color=#206BE3>+20 </color> 칩스',
        price: 3,
        sprite: 3,
    },
    {
        id: 'planet_5',
        name: '화성',
        description:
            '(Lv.1)<color=#F08D00>화성</color> 획득(즉시)\n획득시점.\n <color=red>+3 </color> 배수 \n<color=#206BE3>+30 </color> 칩스',
        price: 3,
        sprite: 4,
    },
    {
        id: 'planet_6',
        name: '목성',
        description:
            '(Lv.1)<color=#F08D00>목성</color> 획득(즉시)\n획득시점.\n <color=red>+2 </color> 배수 \n<color=#206BE3>+15 </color> 칩스',
        price: 3,
        sprite: 5,
    },
    {
        id: 'planet_7',
        name: '토성',
        description:
            '(Lv.1)<color=#F08D00>토성</color> 획득(즉시)\n획득시점.\n <color=red>+3 </color> 배수 \n<color=#206BE3>+15 </color> 칩스',
        price: 3,
        sprite: 6,
    },
    {
        id: 'planet_8',
        name: '천왕성',
        description:
            '(Lv.1)<color=#F08D00>천왕성</color> 획득(즉시)\n획득시점.\n <color=red>+3 </color> 배수 \n<color=#206BE3>+30 </color> 칩스',
        price: 3,
        sprite: 7,
    },
    {
        id: 'planet_9',
        name: '해왕성',
        description:
            '(Lv.1)<color=#F08D00>해왕성</color> 획득(즉시)\n획득시점.\n <color=red>+4 </color> 배수 \n<color=#206BE3>+40 </color> 칩스',
        price: 3,
        sprite: 8,
    },
];

// 전체 타로 카드 리스트 (다크워든 tarot.csv 기반)
export const ALL_TAROT_CARDS: TarotCard[] = [
    {
        id: 'tarot_1',
        name: '타로 A',
        description: '선택한 3장의 카드의 숫자가 1 상승한다.',
        price: 2,
        sprite: 0,
    },
    {
        id: 'tarot_2',
        name: '타로 B',
        description: '선택한 3장의 카드의 숫자가 2 감소한다.',
        price: 3,
        sprite: 1,
    },
    {
        id: 'tarot_3',
        name: '타로 C',
        description: '5장의 무작위 카드가 선택되고, 모두 한 가지 무늬로 변경된다.',
        price: 5,
        sprite: 2,
    },
    {
        id: 'tarot_4',
        name: '타로 D',
        description: '선택한 2장의 카드가 스페이드로 변경된다.',
        price: 4,
        sprite: 3,
    },
    {
        id: 'tarot_5',
        name: '타로 E',
        description: '선택한 2장의 카드가 다이아로 변경된다.',
        price: 4,
        sprite: 4,
    },
    {
        id: 'tarot_6',
        name: '타로 F',
        description: '선택한 2장의 카드가 하트로 변경된다.',
        price: 4,
        sprite: 5,
    },
    {
        id: 'tarot_7',
        name: '타로 G',
        description: '선택한 2장의 카드가 클로버로 변경된다.',
        price: 4,
        sprite: 6,
    },
    {
        id: 'tarot_8',
        name: '타로 H',
        description: '선택한 2장의 카드를 덱에서 삭제한다.',
        price: 6,
        sprite: 7,
    },
    {
        id: 'tarot_9',
        name: '타로 I',
        description: '선택한 3장의 카드 중, 무작위 1장의 카드를 복제한다.',
        price: 5,
        sprite: 8,
    },
    {
        id: 'tarot_10',
        name: '타로 J',
        description: '무작위 행성 카드를 생성한다.',
        price: 5,
        sprite: 9,
    },
];

// 5장 랜덤 추출 (중복 없이, 다크워든과 동일하게 제한)
export function getRandomJokerCards(count: number): JokerCard[] {
    // 다크워든: 0~23번(24개)만 사용
    const pool = ALL_JOKER_CARDS.slice(0, 24);
    const result: JokerCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}

export function getRandomPlanetCards(count: number): PlanetCard[] {
    // 다크워든: 0~7번(8개)만 사용
    const pool = ALL_PLANET_CARDS.slice(0, 8);
    const result: PlanetCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}

export function getRandomTarotCards(count: number): TarotCard[] {
    // 다크워든: 0~9번(10개)만 사용
    const pool = ALL_TAROT_CARDS.slice(0, 10);
    const result: TarotCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}
