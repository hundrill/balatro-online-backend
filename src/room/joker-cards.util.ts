/* eslint-disable prettier/prettier */
// 조커 카드 데이터 타입 정의
export interface SpecialCard {
    id: string;
    name: string;
    description: string;
    price: number;
    sprite: number;
    basevalue?: number;
    increase?: number;
    decrease?: number;
    maxvalue?: number;
    timing_draw?: string;
    timing_round_start?: string;
    timing_hand_play?: string;
    timing_scoring?: string;
    timing_after_scoring?: string;
    timing_fold?: string;
    timing_round_clear?: string;
    timing_tarot_card_use?: string;
    timing_planet_card_use?: string;
}


export const ALL_JOKER_CARDS: SpecialCard[] = [
    {
        id: 'joker_1',
        name: '조커 A',
        description: '다이아몬드로 득점 시마다 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 0,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_mults_2_playingcard_by_suite_diamond_playingcard',
    },
    {
        id: 'joker_2',
        name: '조커 B',
        description:
            '내 플레이 카드에 페어가 포함되어있으면 배수 <color=red>+2</color> 한다.',
        price: 3,
        sprite: 1,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'add_mults_2_total_include_rank_onepair/twopair/triple/fourcard/fivecard/fullhouse/flushfive_playcard',
    },
    {
        id: 'joker_3',
        name: '조커 C',
        description:
            '원페어 시 <color=red>x[basevalue]</color>배. 원페어가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 5,
        sprite: 2,
        basevalue: 1,
        increase: 0.2,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_onepair_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_onepair_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_4',
        name: '조커 D',
        description:
            '투페어 시 <color=red>x[basevalue]</color>배. 투페어가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 3,
        basevalue: 1,
        increase: 0.3,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_twopair_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_twopair_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_5',
        name: '조커 E',
        description:
            '트리플 시 <color=red>x[basevalue]</color>배. 트리플이 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 4,
        basevalue: 1,
        increase: 0.4,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_triple_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_triple_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_6',
        name: '조커 F',
        description:
            '포카드 시 <color=red>x[basevalue]</color>배. 포카드가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 5,
        basevalue: 1,
        increase: 0.7,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_fourcard_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_fourcard_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_7',
        name: '조커 G',
        description:
            '풀하우스 시 <color=red>x[basevalue]</color>배. 풀하우스가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 6,
        basevalue: 1,
        increase: 0.5,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_fullhouse_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_fullhouse_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_8',
        name: '조커 H',
        description:
            '하이카드 시 <color=red>x[basevalue]</color>배. 하이카드가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 7,
        basevalue: 1,
        increase: 0.1,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_highcard_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_highcard_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_9',
        name: '조커 I',
        description:
            '스트레이트 시 <color=red>x[basevalue]</color>배. 스트레이트가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 8,
        basevalue: 1,
        increase: 0.4,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_straight_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_straight_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_10',
        name: '조커 J',
        description:
            '플러시 시 <color=red>x[basevalue]</color>배. 플러시가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
        price: 4,
        sprite: 9,
        basevalue: 1,
        increase: 0.4,
        decrease: 0,
        timing_hand_play:
            'multiple_mults_[basevalue]_total_include_rank_flush_playcard',
        timing_after_scoring:
            'increase_mults_[increase]_self_include_rank_flush_playcard',
        maxvalue: 30,
    },
    {
        id: 'joker_11',
        name: '조커 K',
        description:
            '핸드플레이 시, 내 핸드에 페어가 남아있으면 배수 <color=red>3배</color>한다.',
        price: 4,
        sprite: 10,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_mults_3_total_include_rank_onepair/twopair/triple/fourcard/fivecard/fullhouse/flushfive_handcard',
    },
    {
        id: 'joker_12',
        name: '조커 M',
        description:
            '핸드플레이 시, 내 핸드에 트리플이 남아있으면 배수 <color=red>6배</color>한다.',
        price: 4,
        sprite: 12,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_mults_6_total_include_rank_triple/fourcard/fullhouse_handcard',
    },
    {
        id: 'joker_13',
        name: '조커 N',
        description:
            '핸드플레이 시, 내 핸드에 포 카드가 남아있으면 배수 <color=red>25배</color>한다.',
        price: 4,
        sprite: 13,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_mults_25_total_include_rank_fourcard_handcard',
    },
    {
        id: 'joker_14',
        name: '조커 O',
        description:
            '내 패에 스트레이트가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 14,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_4_total_include_rank_straight_playcard',
    },
    {
        id: 'joker_15',
        name: '조커 P',
        description: '무조건 배수 <color=red>+1</color> 한다.',
        price: 4,
        sprite: 15,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_1_total_nocondition_0_0_0',
    },
    {
        id: 'joker_16',
        name: '조커 Q',
        description:
            '내 패에 트리플이 포함되어있으면 배수 <color=red>+3</color> 한다.',
        price: 4,
        sprite: 16,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play:
            'add_mults_3_total_include_rank_triple/fullhouse/fourcard_playcard',
    },
    {
        id: 'joker_17',
        name: '조커 R',
        description:
            '내 패에 포카드가 포함되어있으면 배수 <color=red>+5</color> 한다.',
        price: 4,
        sprite: 17,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_5_total_include_rank_fourcard_playcard',
    },
    {
        id: 'joker_18',
        name: '조커 S',
        description:
            '내 패에 풀하우스가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 18,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_4_total_include_rank_fullhouse_playcard',
    },
    {
        id: 'joker_19',
        name: '조커 T',
        description:
            '내 패에 플러시가 포함되어있으면 배수 <color=red>+4</color> 한다.',
        price: 4,
        sprite: 19,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_4_total_include_rank_flush_playcard',
    },
    {
        id: 'joker_20',
        name: '조커 U',
        description:
            '하트로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 20,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_chips_10_playingcard_by_suite_heart_playingcard',
    },
    {
        id: 'joker_21',
        name: '조커 V',
        description:
            '스페이드로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 21,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_chips_10_playingcard_by_suite_spade_playingcard',
    },
    {
        id: 'joker_22',
        name: '조커 W',
        description:
            '클럽으로 득점 시마다, 해당 카드의 득점 시 칩스가 <color=blue>+10</color> 성장한다.',
        price: 2,
        sprite: 22,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_chips_10_playingcard_by_suite_club_playingcard',
    },
    {
        id: 'joker_23',
        name: '조커 X',
        description:
            '핸드플레이 시, 내 핸드에 하트가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 23,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'add_mults_2_total_by_suite_heart_handcard',
    },
    {
        id: 'joker_24',
        name: '조커 Y',
        description:
            '핸드플레이 시, 내 핸드에 스페이드가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 24,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'add_mults_2_total_by_suite_spade_handcard',
    },
    {
        id: 'joker_25',
        name: '조커 Z',
        description:
            '핸드플레이 시, 내 핸드에 클럽이 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 25,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'add_mults_2_total_by_suite_club_handcard',
    },
    {
        id: 'joker_26',
        name: '조커 AA',
        description:
            '핸드플레이 시, 내 핸드에 다이아몬드가 남아있는 카드 한 장당 배수가 <color=red>+2</color> 된다.',
        price: 2,
        sprite: 26,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'add_mults_2_total_by_suite_diamond_handcard',
    },
    {
        id: 'joker_27',
        name: '조커 AB',
        description:
            '득점에 사용된 에이스 한 장당, 칩스 <color=red>+20</color> 배수 <color=blue>+4</color> 된다.',
        price: 4,
        sprite: 27,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring:
            'add_chips_20_total_by_number_1_playingcard,add_mults_4_total_by_number_1_playingcard',
    },
    {
        id: 'joker_28',
        name: '조커 AC',
        description:
            '배수 <color=red>+[basevalue]</color>. 라운드 종료 시 마다 배수가 <color=blue>-[decrease]</color> 된다.',
        price: 4,
        sprite: 28,
        basevalue: 20,
        increase: 0.0,
        decrease: 4,
        timing_hand_play: 'add_mults_[basevalue]_total_nocondition_0_0_0',
        timing_round_clear: 'decrease_mults_[decrease]_self_nocondition_0_0_0',
    },
    {
        id: 'joker_29',
        name: '조커 AD',
        description:
            '득점한 모든 카드의 득점 시 칩스가 <color=green>+3</color> 성장한다.',
        price: 4,
        sprite: 29,
        basevalue: 0,
        increase: 3.0,
        decrease: 0,
        timing_scoring:
            'increase_chips_[increase]_playingcard_by_suite_spade/diamond/heart/club_playingcard',
    },
    {
        id: 'joker_30',
        name: '조커 AE',
        description:
            '전체 덱에 보유한 7 한장 당 배수가 <color=red>+2</color> 된다.',
        price: 4,
        sprite: 30,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_2_total_by_number_7_deckcardall',
    },
    {
        id: 'joker_31',
        name: '조커 AF',
        description:
            '전체 덱카드가 52장 보다 적으면, 그 차이 당 배수가 <color=red>+4</color> 된다.',
        price: 4,
        sprite: 31,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_4_total_by_exist_52-all_deckcardall',
    },
    {
        id: 'joker_32',
        name: '조커 AG',
        description:
            '스페이드 카드로 득점 시 배수 <color=red>x[basevalue]</color> 스페이드 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 32,
        basevalue: 1,
        increase: 1.0,
        decrease: 2,
        timing_scoring:
            'increase_mults_[increase]_self_by_suite_spade_playingcard,decrease_mults_[decrease]_self_by_suite_heart/diamond/club_playingcard',
        timing_after_scoring:
            'multiple_mults_[basevalue]_total_include_suite_spade_playcard',
    },
    {
        id: 'joker_33',
        name: '조커 AH',
        description:
            '다이아 카드로 득점 시 배수 <color=red>x[basevalue]</color> 다이아 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 33,
        basevalue: 1,
        increase: 1.0,
        decrease: 2,
        timing_scoring:
            'increase_mults_[increase]_self_by_suite_diamond_playingcard,decrease_mults_[decrease]_self_by_suite_spade/heart/club_playingcard',
        timing_after_scoring:
            'multiple_mults_[basevalue]_total_include_suite_diamond_playcard',
    },
    {
        id: 'joker_34',
        name: '조커 AI',
        description:
            '하트 카드로 득점 시 배수 <color=red>x[basevalue]</color> 하트 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 34,
        basevalue: 1,
        increase: 1.0,
        decrease: 2,
        timing_scoring:
            'increase_mults_[increase]_self_by_suite_heart_playingcard,decrease_mults_[decrease]_self_by_suite_spade/diamond/club_playingcard',
        timing_after_scoring:
            'multiple_mults_[basevalue]_total_include_suite_heart_playcard',
    },
    {
        id: 'joker_35',
        name: '조커 AJ',
        description:
            '클럽 카드로 득점 시 배수 <color=red>x[basevalue]</color> 클럽 카드 득점 시마다 배수가 <color=green>[increase]</color> 성장한다. 다른 카드 득점 시마다 배수가 <color=blue>[decrease]</color> 감퇴한다.',
        price: 4,
        sprite: 35,
        basevalue: 1,
        increase: 1.0,
        decrease: 2,
        timing_scoring:
            'increase_mults_[increase]_self_by_suite_club_playingcard,decrease_mults_[decrease]_self_by_suite_spade/diamond/heart_playingcard',
        timing_after_scoring:
            'multiple_mults_[basevalue]_total_include_suite_club_playcard',
    },
    {
        id: 'joker_36',
        name: '조커 AK',
        description:
            '스페이드 1장으로 플레이 시, 칩스 <color=red>x20</color> 된다.',
        price: 4,
        sprite: 36,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_chips_20_total_count=1_suite_spade_playcard',
    },
    {
        id: 'joker_37',
        name: '조커 AL',
        description:
            '다이아몬드 4장으로 득점 시, 배수 <color=red>x12</color> 된다.',
        price: 4,
        sprite: 37,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_mults_12_total_count=4_suite_diamond_playcard',
    },
    {
        id: 'joker_38',
        name: '조커 AM',
        description: '하트 2장으로 득점 시, 배수 <color=red>x18</color> 된다.',
        price: 4,
        sprite: 38,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'multiple_mults_18_total_count=2_suite_heart_playcard',
    },
    {
        id: 'joker_39',
        name: '조커 AN',
        description: '클럽 3장으로 득점 시, 칩스 <color=red>x15</color> 된다.',
        price: 4,
        sprite: 39,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'multiple_chips_15_total_count=3_suite_club_playcard',
    },
    {
        id: 'joker_40',
        name: '조커 AO',
        description:
            '왼쪽 조커와 동일한 기능을 한다. (레벨은 자신의 레벨로 적용된다.)',
        price: 4,
        sprite: 40,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'copy_left_1_self_by_exist_joker_jokercard',
    },
    {
        id: 'joker_41',
        name: '조커 AP',
        description: '남은 버리기 1 당 칩스가 <color=red>+20</color> 된다.',
        price: 5,
        sprite: 41,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring: 'add_chips_10_total_by_remain_discard_roundvalue',
    },
    {
        id: 'joker_42',
        name: '조커 AQ',
        description:
            '남은 핸드플레이 1 당 배수가 <color=red>+2</color>, 칩스는 <color=blue>-30</color> 된다.',
        price: 5,
        sprite: 42,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'add_mults_2_total_by_remain_hand_roundvalue,subtract_chips_30_total_by_remain_hand_roundvalue',
    },
    {
        id: 'joker_43',
        name: '조커 AR',
        description: '버리기가 0번 남았을 때 배수가 <color=red>+15</color> 된다.',
        price: 5,
        sprite: 43,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_after_scoring:
            'add_chips_10_total_count=0_remain_discard_roundvalue',
    },
    {
        id: 'joker_44',
        name: '조커 AS',
        description: '랜덤으로 배수가 <color=red>+2 ~ 20</color> 된다.',
        price: 5,
        sprite: 44,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play: 'add_mults_2@20_total_include_rank_highcard_playcard',
    },
    {
        id: 'joker_45',
        name: '조커 AU',
        description: '짝수 카드 점수 시 마다, 배수 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 46,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_mults_2_playingcard_by_number_2/4/6/8/10_playingcard',
    },
    {
        id: 'joker_46',
        name: '조커 AV',
        description: '홀수 카드 점수 시 마다, 배수 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 47,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_scoring: 'add_mults_2_playingcard_by_number_1/3/5/7/9_playingcard',
    },
    {
        id: 'joker_47',
        name: '조커 AW',
        description:
            '덱에 남아 있는 카드 1장 당 칩스가 <color=red>+2</color> 된다.',
        price: 5,
        sprite: 48,
        basevalue: 0,
        increase: 0.0,
        decrease: 0,
        timing_hand_play:
            'add_chips_2_playingcard_by_suite_spade/diamond/heart/club_deckcardremain',
    },
];

// 전체 행성 카드 리스트 (다크워든 Card_Planet.cs 기반)
export const ALL_PLANET_CARDS: SpecialCard[] = [
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
export const ALL_TAROT_CARDS: SpecialCard[] = [
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

export function getRandomSpecialCards(count: number): SpecialCard[] {
    // 다크워든: 0~23번(24개)만 사용
    const pool = ALL_JOKER_CARDS.slice(0, 24);
    const result: SpecialCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}

export function getRandomPlanetCards(count: number): SpecialCard[] {
    // 다크워든: 0~7번(8개)만 사용
    const pool = ALL_PLANET_CARDS.slice(0, 8);
    const result: SpecialCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}

export function getRandomTarotCards(count: number): SpecialCard[] {
    // 다크워든: 0~9번(10개)만 사용
    const pool = ALL_TAROT_CARDS.slice(0, 10);
    const result: SpecialCard[] = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return result;
}

export function getRandomShopCards(): SpecialCard[] {
    // 샵 카드용: 조커 3장, 행성 1장, 타로 1장
    const jokerCards = getRandomSpecialCards(3);
    const planetCards = getRandomPlanetCards(1);
    const tarotCards = getRandomTarotCards(1);

    return [...jokerCards, ...planetCards, ...tarotCards];
}

export function getCardById(cardId: string): SpecialCard | undefined {
    // 모든 카드 배열에서 검색
    const allCards = [...ALL_JOKER_CARDS, ...ALL_PLANET_CARDS, ...ALL_TAROT_CARDS];
    return allCards.find(card => card.id === cardId);
}

export function isJokerCard(cardId: string): boolean {
    return ALL_JOKER_CARDS.some(card => card.id === cardId);
}

export function isPlanetCard(cardId: string): boolean {
    return ALL_PLANET_CARDS.some(card => card.id === cardId);
}

export function isTarotCard(cardId: string): boolean {
    return ALL_TAROT_CARDS.some(card => card.id === cardId);
}
