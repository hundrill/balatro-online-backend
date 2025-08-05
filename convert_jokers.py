#!/usr/bin/env python3
import re

# 조커 13-47의 변환 규칙
joker_conversions = {
    # 조커 13: UnUsedHandType + mulMultiplier
    "joker_13": {
        "conditionTypes": ["UnUsedHandType"],
        "effectTypes": ["mulMultiplier"],
        "effectValues": [25],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 14: HandType + addMultiplier
    "joker_14": {
        "conditionTypes": ["HandType"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [4],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 15: Always + addMultiplier
    "joker_15": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [1],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 16: HasTriple + addMultiplier
    "joker_16": {
        "conditionTypes": ["HasTriple"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [3],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 17: HandType + addMultiplier
    "joker_17": {
        "conditionTypes": ["HandType"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [5],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 18: HandType + addMultiplier
    "joker_18": {
        "conditionTypes": ["HandType"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [4],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 19: HandType + addMultiplier
    "joker_19": {
        "conditionTypes": ["HandType"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [4],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 20: CardSuit + addMultiplier (effectOnCard = true)
    "joker_20": {
        "conditionTypes": ["CardSuit"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [10],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [True],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 21: CardSuit + addMultiplier (effectOnCard = true)
    "joker_21": {
        "conditionTypes": ["CardSuit"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [10],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [True],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 22: CardSuit + addMultiplier (effectOnCard = true)
    "joker_22": {
        "conditionTypes": ["CardSuit"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [10],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [True],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 23: UnUsedSuitCount + addMultiplier
    "joker_23": {
        "conditionTypes": ["UnUsedSuitCount"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 24: UnUsedSuitCount + addMultiplier
    "joker_24": {
        "conditionTypes": ["UnUsedSuitCount"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 25: UnUsedSuitCount + addMultiplier
    "joker_25": {
        "conditionTypes": ["UnUsedSuitCount"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 26: UnUsedSuitCount + addMultiplier
    "joker_26": {
        "conditionTypes": ["UnUsedSuitCount"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 27: UsedAceCount + addChips
    "joker_27": {
        "conditionTypes": ["UsedAceCount"],
        "effectTypes": ["addChips"],
        "effectValues": [20],
        "effectNumericValues": [4],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 28: Always + addChips
    "joker_28": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addChips"],
        "effectValues": [20],
        "effectNumericValues": [-4],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 29: Always + addChips
    "joker_29": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addChips"],
        "effectValues": [0],
        "effectNumericValues": [3],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 30: RemainingSevens + addMultiplier
    "joker_30": {
        "conditionTypes": ["RemainingSevens"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 31: RemainingDeck + addMultiplier
    "joker_31": {
        "conditionTypes": ["RemainingDeck"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [4],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 32: Always + UsedSuitCount (복합 조건)
    "joker_32": {
        "conditionTypes": ["Always", "UsedSuitCount"],
        "effectTypes": ["addMultiplier", "addMultiplier"],
        "effectValues": [3, 3],
        "effectNumericValues": [0, 0],
        "effectShowVisuals": [True, True],
        "effectOnCards": [False, False],
        "conditionValues": ["", ""],
        "conditionOperators": ["", "greater"],
        "conditionNumericValues": [0, 0]
    },
    # 조커 33: Always + UsedSuitCount (복합 조건)
    "joker_33": {
        "conditionTypes": ["Always", "UsedSuitCount"],
        "effectTypes": ["addMultiplier", "addMultiplier"],
        "effectValues": [1, 1],
        "effectNumericValues": [0, 0],
        "effectShowVisuals": [True, True],
        "effectOnCards": [False, False],
        "conditionValues": ["", ""],
        "conditionOperators": ["", "greater"],
        "conditionNumericValues": [0, 0]
    },
    # 조커 34: Always + UsedSuitCount (복합 조건)
    "joker_34": {
        "conditionTypes": ["Always", "UsedSuitCount"],
        "effectTypes": ["addMultiplier", "addMultiplier"],
        "effectValues": [2, 2],
        "effectNumericValues": [0, 0],
        "effectShowVisuals": [True, True],
        "effectOnCards": [False, False],
        "conditionValues": ["", ""],
        "conditionOperators": ["", "greater"],
        "conditionNumericValues": [0, 0]
    },
    # 조커 35: Always + UsedSuitCount (복합 조건)
    "joker_35": {
        "conditionTypes": ["Always", "UsedSuitCount"],
        "effectTypes": ["addMultiplier", "addMultiplier"],
        "effectValues": [4, 4],
        "effectNumericValues": [0, 0],
        "effectShowVisuals": [True, True],
        "effectOnCards": [False, False],
        "conditionValues": ["", ""],
        "conditionOperators": ["", "greater"],
        "conditionNumericValues": [0, 0]
    },
    # 조커 36: UsedSuitCount + mulChips
    "joker_36": {
        "conditionTypes": ["UsedSuitCount"],
        "effectTypes": ["mulChips"],
        "effectValues": [0],
        "effectNumericValues": [1],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["equals"],
        "conditionNumericValues": [1]
    },
    # 조커 37: UsedSuitCount + mulMultiplier
    "joker_37": {
        "conditionTypes": ["UsedSuitCount"],
        "effectTypes": ["mulMultiplier"],
        "effectValues": [1],
        "effectNumericValues": [4],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greaterOrEqual"],
        "conditionNumericValues": [4]
    },
    # 조커 38: UsedSuitCount + mulMultiplier
    "joker_38": {
        "conditionTypes": ["UsedSuitCount"],
        "effectTypes": ["mulMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [2],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greaterOrEqual"],
        "conditionNumericValues": [2]
    },
    # 조커 39: UsedSuitCount + mulMultiplier
    "joker_39": {
        "conditionTypes": ["UsedSuitCount"],
        "effectTypes": ["mulMultiplier"],
        "effectValues": [4],
        "effectNumericValues": [3],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greaterOrEqual"],
        "conditionNumericValues": [3]
    },
    # 조커 40: 작업 중 (빈 효과)
    "joker_40": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [0],
        "effectNumericValues": [0],
        "effectShowVisuals": [False],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 41: RemainingDiscards + addMultiplier
    "joker_41": {
        "conditionTypes": ["RemainingDiscards"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [20],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    },
    # 조커 42: 제거 예정 (빈 효과)
    "joker_42": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [0],
        "effectNumericValues": [0],
        "effectShowVisuals": [False],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 43: RemainingDiscards + addMultiplier
    "joker_43": {
        "conditionTypes": ["RemainingDiscards"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [15],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["lessOrEqual"],
        "conditionNumericValues": [0]
    },
    # 조커 44: Always + addMultiplierByRandomValue
    "joker_44": {
        "conditionTypes": ["Always"],
        "effectTypes": ["addMultiplierByRandomValue"],
        "effectValues": [0],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 45: IsEvenRank + addMultiplier
    "joker_45": {
        "conditionTypes": ["IsEvenRank"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 46: IsEvenRank + addMultiplier (false)
    "joker_46": {
        "conditionTypes": ["IsEvenRank"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": ["false"],
        "conditionOperators": [""],
        "conditionNumericValues": [0]
    },
    # 조커 47: RemainingDeck + addMultiplier
    "joker_47": {
        "conditionTypes": ["RemainingDeck"],
        "effectTypes": ["addMultiplier"],
        "effectValues": [2],
        "effectNumericValues": [0],
        "effectShowVisuals": [True],
        "effectOnCards": [False],
        "conditionValues": [""],
        "conditionOperators": ["greater"],
        "conditionNumericValues": [0]
    }
}

def convert_joker_effects(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 각 조커에 대해 변환 수행
    for joker_id, conversion in joker_conversions.items():
        # 조커 블록을 찾기 위한 패턴
        pattern = rf'id = "{joker_id}"[^}}]+effects = new List<JokerEffect> \{{[^}}]+}}'
        
        # 새로운 다중 타이밍/효과 필드들 생성
        new_fields = f'''
            // 다중 타이밍/효과 지원 필드들
            effectTimings = new List<JokerEffectTiming> {{
                {", ".join([f"JokerEffectTiming.OnAfterScoring" for _ in conversion["conditionTypes"]])}
            }},
            effectTypes = new List<string> {{
                {", ".join([f'"{effect_type}"' for effect_type in conversion["effectTypes"]])}
            }},
            effectValues = new List<float> {{ {", ".join([str(v) for v in conversion["effectValues"]])} }},
            effectNumericValues = new List<float> {{ {", ".join([str(v) + "f" if isinstance(v, float) else str(v) for v in conversion["effectNumericValues"]])} }},
            effectShowVisuals = new List<bool> {{ {", ".join([str(v).lower() for v in conversion["effectShowVisuals"]])} }},
            effectOnCards = new List<bool> {{ {", ".join([str(v).lower() for v in conversion["effectOnCards"]])} }},
            conditionTypes = new List<ConditionType> {{
                {", ".join([f"ConditionType.{condition_type}" for condition_type in conversion["conditionTypes"]])}
            }},
            conditionValues = new List<string> {{ {", ".join([f'"{v}"' for v in conversion["conditionValues"]])} }},
            conditionOperators = new List<string> {{ {", ".join([f'"{v}"' for v in conversion["conditionOperators"]])} }},
            conditionNumericValues = new List<float> {{ {", ".join([str(v) + "f" if isinstance(v, float) else str(v) for v in conversion["conditionNumericValues"]])} }},
            
            // 기존 호환용 (빈 리스트로 설정)
            effects = new List<JokerEffect>()'''
        
        # 기존 effects 블록을 찾아서 교체
        old_pattern = rf'(id = "{joker_id}"[^}}]+)// 조건 관련 필드들[^}}]+// 효과 관련 필드들[^}}]+effects = new List<JokerEffect> \{{[^}}]+}}'
        replacement = rf'\1// 조건 관련 필드들 (단일)\n            conditionSuit = "",\n            conditionHandType = "",\n            conditionOperator = "",\n            conditionNumericValue = 0,\n            \n            // 효과 관련 필드들 (단일)\n            effectValue = 0,\n            effectNumericValue = 0,\n            effectShowVisual = true,\n            effectOnCard = false,{new_fields}'
        
        content = re.sub(old_pattern, replacement, content, flags=re.DOTALL)
    
    # 파일에 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("조커 변환이 완료되었습니다!")

if __name__ == "__main__":
    file_path = "Assets/Scripts/Game/SpecialCardManager.cs"
    convert_joker_effects(file_path) 