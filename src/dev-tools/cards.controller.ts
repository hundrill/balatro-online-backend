import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';


@Controller('dev-tools')
export class CardsController {
    @Get('cards')
    getCardsPage(@Res() res: Response) {
        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Tools - 카드 관리</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .back-btn {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .back-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        
        .content {
            padding: 30px;
        }
        
        .card-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
        }
        
        .card-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .card-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 280px;
        }
        
        .card-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        /* Multiple Select 스타일 */
        select[multiple] {
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            padding: 8px;
            background: white;
            min-height: 400px; /* 20개 옵션에 맞게 높이 증가 */
        }

        select[multiple] option {
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 4px;
            cursor: pointer;
        }

        select[multiple] option:checked {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
        }

        select[multiple] option:hover {
            background: #f0f0f0;
        }

        /* Multiple Select 라벨 스타일 */
        label:has(+ select[multiple]) {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            display: block;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .card-id {
            font-size: 0.8em;
            color: #666;
            margin-bottom: 5px;
        }
        
        .card-name {
            font-weight: 600;
            color: #333;
            font-size: 1.2em;
            margin-bottom: 5px;
        }
        
        .card-status {
            font-size: 0.8em;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        .card-status.active {
            background: #e8f5e8;
            color: #2e7d32;
        }
        
        .card-status.inactive {
            background: #ffebee;
            color: #c62828;
        }
        
        .card-price {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .card-description {
            color: #666;
            font-size: 0.9em;
            line-height: 1.4;
            margin-bottom: 15px;
            white-space: pre-wrap;
            flex: 1;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
        }
        
        .card-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 0.8em;
            margin-bottom: 10px;
            flex-shrink: 0;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .stat-label {
            color: #666;
            font-weight: 500;
        }
        
        .stat-value {
            color: #333;
            font-weight: 600;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto; 
            padding: 30px; 
            border-radius: 10px;
            width: 90%; 
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #667eea;
        }
        
        .modal-title {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5em;
            cursor: pointer;
            color: #666;
        }
        
        .close-btn:hover {
            opacity: 0.7;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
        }
        
        .form-group { 
            margin-bottom: 15px; 
        }
        
        .form-group.full-width {
            grid-column: 1 / -1;
        }
        
        .form-group.checkbox-group {
            flex-direction: row;
            align-items: center;
            gap: 10px;
        }
        
        .form-group label { 
            display: block; 
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input, .form-group textarea { 
            width: 100%; 
            padding: 8px 12px; 
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        
        .form-group textarea { 
            height: 80px; 
            resize: vertical;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        
        .cancel-btn {
            background: #6c757d;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .save-btn {
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .edit-btn {
            background: #2196F3;
            color: white;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            margin-top: auto;
            width: 100%;
            transition: background-color 0.3s ease;
            flex-shrink: 0;
        }
        
        .edit-btn:hover {
            background: #1976D2;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #f5c6cb;
        }
        
        .form-group.checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        .form-group.checkbox-group label {
            margin: 0;
            font-weight: 600;
            color: #495057;
            cursor: pointer;
        }
        .form-group.checkbox-group input[type="checkbox"] {
            width: auto;
            margin: 0;
            transform: scale(1.2);
            cursor: pointer;
        }
        
        /* 새로운 체크박스 그룹 스타일 */
        .timing-item, .effect-item, .condition-item, .condition-value-item, .operator-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }
        
        .timing-item input[type="checkbox"], 
        .effect-item input[type="checkbox"], 
        .condition-item input[type="checkbox"], 
        .condition-value-item input[type="checkbox"], 
        .operator-item input[type="checkbox"] {
            width: auto;
            margin: 0;
            transform: scale(1.1);
            cursor: pointer;
        }
        
        .timing-item label, 
        .effect-item label, 
        .condition-item label, 
        .condition-value-item label, 
        .operator-item label {
            margin: 0;
            font-weight: 500;
            color: #495057;
            cursor: pointer;
            flex: 1;
        }
        
        #effect-timings-container,
        #effect-types-container,
        #condition-types-container,
        #condition-values-container,
        #condition-operators-container {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            background: white;
        }
        
        .condition-effect-pair {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            background: #f8f9fa;
            margin-bottom: 20px;
        }
        
        .condition-effect-pair {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
        }
        
        .condition-effect-pair .form-group {
            margin-bottom: 10px;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast.error {
            background: #f44336;
        }
        
        .condition-effect-pair select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
        }
        
        .condition-effect-pair select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/dev-tools/dashboard" class="back-btn">← 대시보드로 돌아가기</a>
            <h1>🃏 카드 관리</h1>
            <p>조커, 행성, 타로 카드들의 속성과 효과를 관리합니다</p>
        </div>
        
        <div class="content">
            <div id="cards-container">
                <div class="card-section">
                    <h2>🃏 조커 카드</h2>
                    <div id="joker-cards" class="cards-grid">
                        <div class="loading">카드 목록을 불러오는 중...</div>
                    </div>
                </div>
                <div class="card-section">
                    <h2>🌍 행성 카드</h2>
                    <div id="planet-cards" class="cards-grid">
                        <div class="loading">카드 목록을 불러오는 중...</div>
                    </div>
                </div>
                <div class="card-section">
                    <h2>🔮 타로 카드</h2>
                    <div id="tarot-cards" class="cards-grid">
                        <div class="loading">카드 목록을 불러오는 중...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toast" class="toast"></div>

    <!-- Edit Modal -->
    <div id="editModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">카드 편집</h2>
                <button type="button" class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <form id="editForm">
                                    <div class="form-grid">
                        <div class="form-group">
                            <label>카드 ID:</label>
                            <input type="text" id="edit-id" readonly>
                        </div>
                                                <div class="form-group">
                            <label>카드명:</label>
                            <input type="text" id="edit-name">
                        </div>
                        <div class="form-group">
                            <label>가격:</label>
                            <input type="number" id="edit-price">
                        </div>

                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="edit-is-active">
                            <label for="edit-is-active">활성화</label>
                        </div>

                        <!-- 행성카드 전용 필드들 -->
                        <div class="form-group" id="planet-fields" style="display: none;">
                            <label>칩 강화:</label>
                            <input type="number" id="edit-enhance-chips" step="0.1">
                        </div>
                        <div class="form-group" id="planet-fields-2" style="display: none;">
                            <label>배율 강화:</label>
                            <input type="number" id="edit-enhance-mul" step="0.1">
                        </div>
                        
                        <!-- 타로카드 전용 필드들 -->
                        <div class="form-group" id="tarot-fields" style="display: none;">
                            <label>필요 카드수:</label>
                            <input type="number" id="edit-need-card-count">
                        </div>
                        
                        <div class="form-group full-width">
                            <label>설명 (한국어):</label>
                            <textarea id="edit-description-ko"></textarea>
                        </div>
                        
                        <!-- 조커카드 전용 조건-효과 시스템 필드들 -->
                        <div class="form-group full-width" id="joker-fields">
                            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">조건-효과 쌍 1</h3>
                            <div class="condition-effect-pair">
                                <div class="form-group">
                                    <label>조건 타입:</label>
                                    <select id="condition-type-1" onchange="updateConditionFields(1)">
                                        <option value="">선택하세요</option>
                                        <option value="CardSuit">카드 무늬</option>
                                        <option value="CardRank">카드 숫자</option>
                                        <option value="HandType">카드 핸드</option>
                                        <option value="UsedSuitCount">카드 무늬 개수</option>
                                        <option value="UsedCardCount">카드 개수</option>
                                        <option value="UnUsedHandType">미사용 카드 핸드</option>
                                        <option value="UnUsedSuitCount">미사용 카드 무늬 개수</option>
                                        <option value="RemainingCardCount">미사용 카드 개수</option>
                                        <option value="DeckCardCount">덱 안에 카드 개수</option>
                                        <option value="RemainingDeck">남은 덱 카드 개수</option>
                                        <option value="TotalDeck">전체 덱 카드 개수</option>
                                        <option value="RemainingDiscards">남은 버리기 횟수</option>
                                        <option value="Always">항상 참</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 값:</label>
                                    <select id="condition-value-1" multiple size="20">
                                        <option value="">선택하세요</option>
                                        <option value="Hearts">하트</option>
                                        <option value="Diamonds">다이아몬드</option>
                                        <option value="Clubs">클럽</option>
                                        <option value="Spades">스페이드</option>
                                        <option value="1">1 (에이스)</option>
                                        <option value="13">13 (킹)</option>
                                        <option value="12">12 (퀸)</option>
                                        <option value="11">11 (잭)</option>
                                        <option value="10">10</option>
                                        <option value="9">9</option>
                                        <option value="8">8</option>
                                        <option value="7">7</option>
                                        <option value="6">6</option>
                                        <option value="5">5</option>
                                        <option value="4">4</option>
                                        <option value="3">3</option>
                                        <option value="2">2</option>
                                        <option value="HighCard">하이카드</option>
                                        <option value="OnePair">원페어</option>
                                        <option value="TwoPair">투페어</option>
                                        <option value="ThreeOfAKind">트리플</option>
                                        <option value="Straight">스트레이트</option>
                                        <option value="Flush">플러시</option>
                                        <option value="FullHouse">풀하우스</option>                                        
                                        <option value="FourOfAKind">포카드</option>                                        
                                        <option value="StraightFlush">스트레이트 플러시</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 숫자 값:</label>
                                    <input type="number" id="condition-numeric-1" placeholder="숫자 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>조건 연산자:</label>
                                    <select id="condition-operator-1">
                                        <option value="">선택하세요</option>
                                        <option value="Equals">같음</option>
                                        <option value="Greater">초과</option>
                                        <option value="GreaterOrEqual">이상</option>
                                        <option value="Less">미만</option>
                                        <option value="LessOrEqual">이하</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타이밍:</label>
                                    <select id="effect-timing-1">
                                        <option value="">선택하세요</option>
                                        <option value="OnScoring">득점 시</option>
                                        <option value="OnHandPlay">핸드플레이 시</option>
                                        <option value="OnAfterScoring">득점 후</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타입:</label>
                                    <select id="effect-type-1" onchange="updateEffectValueField(1)">
                                        <option value="">선택하세요</option>
                                        <option value="AddMultiplier">배수 추가</option>
                                        <option value="AddMultiplierByRandomValue">랜덤 값에 따른 배수 추가</option>
                                        <option value="MulMultiplier">배수 곱하기</option>
                                        <option value="AddChips">칩 추가</option>
                                        <option value="MulChips">칩 곱하기</option>
                                        <option value="GrowBaseValue">기본값 성장</option>
                                        <option value="DecrementBaseValue">기본값 감소</option>
                                        <option value="GrowCardChips">카드 칩스 성장</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 값:</label>
                                    <input type="number" id="effect-value-1" step="0.1" placeholder="효과 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>효과 표시 대상:</label>
                                    <select id="effect-target-1">
                                        <option value="">선택하세요</option>
                                        <option value="Card">카드</option>
                                        <option value="Joker">조커</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="effect-by-count-1"> 효과값에 카운트 적용
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group full-width" id="condition-effect-pair-2-container" style="display: none;">
                            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">조건-효과 쌍 2</h3>
                            <div class="condition-effect-pair">
                                <div class="form-group">
                                    <label>조건 타입:</label>
                                    <select id="condition-type-2" onchange="updateConditionFields(2)">
                                        <option value="">선택하세요</option>
                                        <option value="CardSuit">카드 무늬</option>
                                        <option value="CardRank">카드 숫자</option>
                                        <option value="HandType">카드 핸드</option>
                                        <option value="UsedSuitCount">카드 무늬 개수</option>
                                        <option value="UsedCardCount">카드 개수</option>
                                        <option value="UnUsedHandType">미사용 카드 핸드</option>
                                        <option value="UnUsedSuitCount">미사용 카드 무늬 개수</option>
                                        <option value="RemainingCardCount">미사용 카드 개수</option>
                                        <option value="DeckCardCount">덱 안에 카드 개수</option>
                                        <option value="RemainingDeck">남은 덱 카드 개수</option>
                                        <option value="TotalDeck">전체 덱 카드 개수</option>
                                        <option value="RemainingDiscards">남은 버리기 횟수</option>
                                        <option value="Always">항상 참</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 값:</label>
                                    <select id="condition-value-2" multiple size="20">
                                        <option value="">선택하세요</option>
                                        <option value="Hearts">하트</option>
                                        <option value="Diamonds">다이아몬드</option>
                                        <option value="Clubs">클럽</option>
                                        <option value="Spades">스페이드</option>
                                        <option value="1">1 (에이스)</option>
                                        <option value="13">13 (킹)</option>
                                        <option value="12">12 (퀸)</option>
                                        <option value="11">11 (잭)</option>
                                        <option value="10">10</option>
                                        <option value="9">9</option>
                                        <option value="8">8</option>
                                        <option value="7">7</option>
                                        <option value="6">6</option>
                                        <option value="5">5</option>
                                        <option value="4">4</option>
                                        <option value="3">3</option>
                                        <option value="2">2</option>
                                        <option value="HighCard">하이카드</option>
                                        <option value="OnePair">원페어</option>
                                        <option value="TwoPair">투페어</option>
                                        <option value="ThreeOfAKind">트리플</option>
                                        <option value="Straight">스트레이트</option>
                                        <option value="Flush">플러시</option>
                                        <option value="FullHouse">풀하우스</option>                                        
                                        <option value="FourOfAKind">포카드</option>                                        
                                        <option value="StraightFlush">스트레이트 플러시</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 숫자 값:</label>
                                    <input type="number" id="condition-numeric-2" placeholder="숫자 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>조건 연산자:</label>
                                    <select id="condition-operator-2">
                                        <option value="">선택하세요</option>
                                        <option value="Equals">같음</option>
                                        <option value="GreaterOrEqual">이상</option>
                                        <option value="LessOrEqual">이하</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타이밍:</label>
                                    <select id="effect-timing-2">
                                        <option value="">선택하세요</option>
                                        <option value="OnScoring">득점 시</option>
                                        <option value="OnHandPlay">핸드플레이 시</option>
                                        <option value="OnAfterScoring">득점 후</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타입:</label>
                                    <select id="effect-type-2" onchange="updateEffectValueField(2)">
                                        <option value="">선택하세요</option>
                                        <option value="AddMultiplier">배수 추가</option>
                                        <option value="AddMultiplierByRandomValue">랜덤 값에 따른 배수 추가</option>
                                        <option value="MulMultiplier">배수 곱하기</option>
                                        <option value="AddChips">칩 추가</option>
                                        <option value="MulChips">칩 곱하기</option>
                                        <option value="GrowBaseValue">기본값 성장</option>
                                        <option value="DecrementBaseValue">기본값 감소</option>
                                        <option value="GrowCardChips">카드 칩스 성장</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 값:</label>
                                    <input type="number" id="effect-value-2" step="0.1" placeholder="효과 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>효과 표시 대상:</label>
                                    <select id="effect-target-2">
                                        <option value="">선택하세요</option>
                                        <option value="Card">카드</option>
                                        <option value="Joker">조커</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="effect-by-count-2"> 효과값에 카운트 적용
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 조건-효과 쌍 3 -->
                        <div class="form-group full-width" id="condition-effect-pair-3-container" style="display: none;">
                            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">조건-효과 쌍 3</h3>
                            <div class="condition-effect-pair">
                                <div class="form-group">
                                    <label>조건 타입:</label>
                                    <select id="condition-type-3" onchange="updateConditionFields(3)">
                                        <option value="">선택하세요</option>
                                        <option value="CardSuit">카드 무늬</option>
                                        <option value="CardRank">카드 숫자</option>
                                        <option value="HandType">카드 핸드</option>
                                        <option value="UsedSuitCount">카드 무늬 개수</option>
                                        <option value="UsedCardCount">카드 개수</option>
                                        <option value="UnUsedHandType">미사용 카드 핸드</option>
                                        <option value="UnUsedSuitCount">미사용 카드 무늬 개수</option>
                                        <option value="RemainingCardCount">미사용 카드 개수</option>
                                        <option value="DeckCardCount">덱 안에 카드 개수</option>
                                        <option value="RemainingDeck">남은 덱 카드 개수</option>
                                        <option value="TotalDeck">전체 덱 카드 개수</option>
                                        <option value="RemainingDiscards">남은 버리기 횟수</option>
                                        <option value="Always">항상 참</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 값:</label>
                                    <select id="condition-value-3" multiple size="20">
                                        <option value="">선택하세요</option>
                                        <option value="Hearts">하트</option>
                                        <option value="Diamonds">다이아몬드</option>
                                        <option value="Clubs">클럽</option>
                                        <option value="Spades">스페이드</option>
                                        <option value="1">1 (에이스)</option>
                                        <option value="13">13 (킹)</option>
                                        <option value="12">12 (퀸)</option>
                                        <option value="11">11 (잭)</option>
                                        <option value="10">10</option>
                                        <option value="9">9</option>
                                        <option value="8">8</option>
                                        <option value="7">7</option>
                                        <option value="6">6</option>
                                        <option value="5">5</option>
                                        <option value="4">4</option>
                                        <option value="3">3</option>
                                        <option value="2">2</option>
                                        <option value="HighCard">하이카드</option>
                                        <option value="OnePair">원페어</option>
                                        <option value="TwoPair">투페어</option>
                                        <option value="ThreeOfAKind">트리플</option>
                                        <option value="Straight">스트레이트</option>
                                        <option value="Flush">플러시</option>
                                        <option value="FullHouse">풀하우스</option>                                        
                                        <option value="FourOfAKind">포카드</option>                                        
                                        <option value="StraightFlush">스트레이트 플러시</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 숫자 값:</label>
                                    <input type="number" id="condition-numeric-3" placeholder="숫자 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>조건 연산자:</label>
                                    <select id="condition-operator-3">
                                        <option value="">선택하세요</option>
                                        <option value="Equals">같음</option>
                                        <option value="GreaterOrEqual">이상</option>
                                        <option value="LessOrEqual">이하</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타이밍:</label>
                                    <select id="effect-timing-3">
                                        <option value="">선택하세요</option>
                                        <option value="OnScoring">득점 시</option>
                                        <option value="OnHandPlay">핸드플레이 시</option>
                                        <option value="OnAfterScoring">득점 후</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타입:</label>
                                    <select id="effect-type-3" onchange="updateEffectValueField(3)">
                                        <option value="">선택하세요</option>
                                        <option value="AddMultiplier">배수 추가</option>
                                        <option value="AddMultiplierByRandomValue">랜덤 값에 따른 배수 추가</option>
                                        <option value="MulMultiplier">배수 곱하기</option>
                                        <option value="AddChips">칩 추가</option>
                                        <option value="MulChips">칩 곱하기</option>
                                        <option value="GrowBaseValue">기본값 성장</option>
                                        <option value="DecrementBaseValue">기본값 감소</option>
                                        <option value="GrowCardChips">카드 칩스 성장</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 값:</label>
                                    <input type="number" id="effect-value-3" step="0.1" placeholder="효과 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>효과 표시 대상:</label>
                                    <select id="effect-target-3">
                                        <option value="">선택하세요</option>
                                        <option value="Card">카드</option>
                                        <option value="Joker">조커</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="effect-by-count-3"> 효과값에 카운트 적용
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 조건-효과 쌍 4 -->
                        <div class="form-group full-width" id="condition-effect-pair-4-container" style="display: none;">
                            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">조건-효과 쌍 4</h3>
                            <div class="condition-effect-pair">
                                <div class="form-group">
                                    <label>조건 타입:</label>
                                    <select id="condition-type-4" onchange="updateConditionFields(4)">
                                        <option value="">선택하세요</option>
                                        <option value="CardSuit">카드 무늬</option>
                                        <option value="CardRank">카드 숫자</option>
                                        <option value="HandType">카드 핸드</option>
                                        <option value="UsedSuitCount">카드 무늬 개수</option>
                                        <option value="UsedCardCount">카드 개수</option>
                                        <option value="UnUsedHandType">미사용 카드 핸드</option>
                                        <option value="UnUsedSuitCount">미사용 카드 무늬 개수</option>
                                        <option value="RemainingCardCount">미사용 카드 개수</option>
                                        <option value="DeckCardCount">덱 안에 카드 개수</option>
                                        <option value="RemainingDeck">남은 덱 카드 개수</option>
                                        <option value="TotalDeck">전체 덱 카드 개수</option>
                                        <option value="RemainingDiscards">남은 버리기 횟수</option>
                                        <option value="Always">항상 참</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 값:</label>
                                    <select id="condition-value-4" multiple size="20">
                                        <option value="">선택하세요</option>
                                        <option value="Hearts">하트</option>
                                        <option value="Diamonds">다이아몬드</option>
                                        <option value="Clubs">클럽</option>
                                        <option value="Spades">스페이드</option>
                                        <option value="1">1 (에이스)</option>
                                        <option value="13">13 (킹)</option>
                                        <option value="12">12 (퀸)</option>
                                        <option value="11">11 (잭)</option>
                                        <option value="10">10</option>
                                        <option value="9">9</option>
                                        <option value="8">8</option>
                                        <option value="7">7</option>
                                        <option value="6">6</option>
                                        <option value="5">5</option>
                                        <option value="4">4</option>
                                        <option value="3">3</option>
                                        <option value="2">2</option>
                                        <option value="HighCard">하이카드</option>
                                        <option value="OnePair">원페어</option>
                                        <option value="TwoPair">투페어</option>
                                        <option value="ThreeOfAKind">트리플</option>
                                        <option value="Straight">스트레이트</option>
                                        <option value="Flush">플러시</option>
                                        <option value="FullHouse">풀하우스</option>                                        
                                        <option value="FourOfAKind">포카드</option>                                        
                                        <option value="StraightFlush">스트레이트 플러시</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 숫자 값:</label>
                                    <input type="number" id="condition-numeric-4" placeholder="숫자 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>조건 연산자:</label>
                                    <select id="condition-operator-4">
                                        <option value="">선택하세요</option>
                                        <option value="Equals">같음</option>
                                        <option value="GreaterOrEqual">이상</option>
                                        <option value="LessOrEqual">이하</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타이밍:</label>
                                    <select id="effect-timing-4">
                                        <option value="">선택하세요</option>
                                        <option value="OnScoring">득점 시</option>
                                        <option value="OnHandPlay">핸드플레이 시</option>
                                        <option value="OnAfterScoring">득점 후</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타입:</label>
                                    <select id="effect-type-4" onchange="updateEffectValueField(4)">
                                        <option value="">선택하세요</option>
                                        <option value="AddMultiplier">배수 추가</option>
                                        <option value="AddMultiplierByRandomValue">랜덤 값에 따른 배수 추가</option>
                                        <option value="MulMultiplier">배수 곱하기</option>
                                        <option value="AddChips">칩 추가</option>
                                        <option value="MulChips">칩 곱하기</option>
                                        <option value="GrowBaseValue">기본값 성장</option>
                                        <option value="DecrementBaseValue">기본값 감소</option>
                                        <option value="GrowCardChips">카드 칩스 성장</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 값:</label>
                                    <input type="number" id="effect-value-4" step="0.1" placeholder="효과 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>효과 표시 대상:</label>
                                    <select id="effect-target-4">
                                        <option value="">선택하세요</option>
                                        <option value="Card">카드</option>
                                        <option value="Joker">조커</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="effect-by-count-4"> 효과값에 카운트 적용
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- 조건-효과 쌍 5 -->
                        <div class="form-group full-width" id="condition-effect-pair-5-container" style="display: none;">
                            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">조건-효과 쌍 5</h3>
                            <div class="condition-effect-pair">
                                <div class="form-group">
                                    <label>조건 타입:</label>
                                    <select id="condition-type-5" onchange="updateConditionFields(5)">
                                        <option value="">선택하세요</option>
                                        <option value="CardSuit">카드 무늬</option>
                                        <option value="CardRank">카드 숫자</option>
                                        <option value="HandType">카드 핸드</option>
                                        <option value="UsedSuitCount">카드 무늬 개수</option>
                                        <option value="UsedCardCount">카드 개수</option>
                                        <option value="UnUsedHandType">미사용 카드 핸드</option>
                                        <option value="UnUsedSuitCount">미사용 카드 무늬 개수</option>
                                        <option value="RemainingCardCount">미사용 카드 개수</option>
                                        <option value="DeckCardCount">덱 안에 카드 개수</option>
                                        <option value="RemainingDeck">남은 덱 카드 개수</option>
                                        <option value="TotalDeck">전체 덱 카드 개수</option>
                                        <option value="RemainingDiscards">남은 버리기 횟수</option>
                                        <option value="Always">항상 참</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 값:</label>
                                    <select id="condition-value-5" multiple size="20">
                                        <option value="">선택하세요</option>
                                        <option value="Hearts">하트</option>
                                        <option value="Diamonds">다이아몬드</option>
                                        <option value="Clubs">클럽</option>
                                        <option value="Spades">스페이드</option>
                                        <option value="1">1 (에이스)</option>
                                        <option value="13">13 (킹)</option>
                                        <option value="12">12 (퀸)</option>
                                        <option value="11">11 (잭)</option>
                                        <option value="10">10</option>
                                        <option value="9">9</option>
                                        <option value="8">8</option>
                                        <option value="7">7</option>
                                        <option value="6">6</option>
                                        <option value="5">5</option>
                                        <option value="4">4</option>
                                        <option value="3">3</option>
                                        <option value="2">2</option>
                                        <option value="HighCard">하이카드</option>
                                        <option value="OnePair">원페어</option>
                                        <option value="TwoPair">투페어</option>
                                        <option value="ThreeOfAKind">트리플</option>
                                        <option value="Straight">스트레이트</option>
                                        <option value="Flush">플러시</option>
                                        <option value="FullHouse">풀하우스</option>                                        
                                        <option value="FourOfAKind">포카드</option>                                        
                                        <option value="StraightFlush">스트레이트 플러시</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>조건 숫자 값:</label>
                                    <input type="number" id="condition-numeric-5" placeholder="숫자 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>조건 연산자:</label>
                                    <select id="condition-operator-5">
                                        <option value="">선택하세요</option>
                                        <option value="Equals">같음</option>
                                        <option value="GreaterOrEqual">이상</option>
                                        <option value="LessOrEqual">이하</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타이밍:</label>
                                    <select id="effect-timing-5">
                                        <option value="">선택하세요</option>
                                        <option value="OnScoring">득점 시</option>
                                        <option value="OnHandPlay">핸드플레이 시</option>
                                        <option value="OnAfterScoring">득점 후</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 타입:</label>
                                    <select id="effect-type-5" onchange="updateEffectValueField(5)">
                                        <option value="">선택하세요</option>
                                        <option value="AddMultiplier">배수 추가</option>
                                        <option value="AddMultiplierByRandomValue">랜덤 값에 따른 배수 추가</option>
                                        <option value="MulMultiplier">배수 곱하기</option>
                                        <option value="AddChips">칩 추가</option>
                                        <option value="MulChips">칩 곱하기</option>
                                        <option value="GrowBaseValue">기본값 성장</option>
                                        <option value="DecrementBaseValue">기본값 감소</option>
                                        <option value="GrowCardChips">카드 칩스 성장</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>효과 값:</label>
                                    <input type="number" id="effect-value-5" step="0.1" placeholder="효과 값 입력">
                                </div>
                                <div class="form-group">
                                    <label>효과 표시 대상:</label>
                                    <select id="effect-target-5">
                                        <option value="">선택하세요</option>
                                        <option value="Card">카드</option>
                                        <option value="Joker">조커</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="effect-by-count-5"> 효과값에 카운트 적용
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group full-width" id="add-condition-effect-pair-btn" style="display: none;">
                                        <button type="button" class="btn btn-secondary" onclick="addConditionEffectPair()" style="width: 100%; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                + 조건-효과 쌍 추가
            </button>
                        </div>
                    </div>
            </form>
            <div class="modal-actions">
                <button type="button" class="cancel-btn" onclick="closeModal()">취소</button>
                <button type="submit" form="editForm" class="save-btn">저장</button>
            </div>
            <div class="form-group full-width" style="margin-top: 16px; border-top: 1px solid #e0e0e0; padding-top: 16px;">
                <h3 style="margin-bottom: 10px; color: #333;">추가 번역</h3>
                <div class="form-group">
                    <label>설명 (인도네시아어):</label>
                    <textarea id="extra-description-id"></textarea>
                </div>
                <div class="form-group">
                    <label>설명 (영어):</label>
                    <textarea id="extra-description-en"></textarea>
                </div>
                <div class="modal-actions" style="justify-content: flex-end;">
                    <button type="button" class="save-btn" onclick="saveExtraTranslations()">추가 번역 저장</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 페이지 로드 시 카드 목록 로드
        window.onload = function() {
            loadCards();
        };

        // 추가 번역 저장
        async function saveExtraTranslations(){
            const cardId = document.getElementById('edit-id').value;
            const descriptionId = (document.getElementById('extra-description-id')||{}).value || '';
            const descriptionEn = (document.getElementById('extra-description-en')||{}).value || '';
            try{
                const response = await fetch('/dev-tools/cards/api/'+cardId,{
                    method:'PUT',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ id: cardId, descriptionId, descriptionEn })
                });
                if(response.ok){
                    showToast('추가 번역이 저장되었습니다.');
                    loadCards();
                } else {
                    showToast('추가 번역 저장 실패', true);
                }
            }catch(err){
                console.error(err);
                showToast('추가 번역 저장 실패', true);
            }
        }
        async function loadCards() {
            try {
                const response = await fetch('/dev-tools/cards/api');
                const data = await response.json();
                currentCards = data;
                renderCards();
            } catch (error) {
                console.error('Failed to load cards:', error);
            }
        }

        let currentCards = {};

        // 카드 렌더링
        function renderCards() {
            renderCardSection('joker-cards', currentCards.jokerCards || []);
            renderCardSection('planet-cards', currentCards.planetCards || []);
            renderCardSection('tarot-cards', currentCards.tarotCards || []);
        }

        function renderCardSection(containerId, cards) {
            const container = document.getElementById(containerId);
            if (!cards.length) {
                container.innerHTML = '<p>카드가 없습니다</p>';
                return;
            }

            container.innerHTML = '';
            cards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card-item';
                
                // 카드 타입에 따라 다른 필드들 표시
                const isJoker = containerId === 'joker-cards';
                const isPlanet = containerId === 'planet-cards';
                const isTarot = containerId === 'tarot-cards';
                
                // 설명 치환 함수
                function replaceDescription(desc) {
                    if (!desc) return '설명 없음';
                    
                    // 한 번에 모든 플레이스홀더를 치환하는 함수
                    return desc.replace(/\\[([^\\]]+)\\]/g, function(match, placeholder) {
                        switch(placeholder) {
                            case 'basevalue':
                                return card.baseValue || 0;
                            case 'increase':
                                return card.increase || 0;
                            case 'decrease':
                                return card.decrease || 0;
                            case 'enhancechips':
                                return card.enhanceChips || 0;
                            case 'enhancemul':
                                return card.enhanceMul || 0;
                            case 'needcardcount':
                                return card.needCardCount || 0;
                            case 'maxvalue':
                                return card.maxValue || 0;
                            case 'level':
                                return '1'; // 임시로 1로 표시
                            default:
                                return match; // 알 수 없는 플레이스홀더는 그대로 유지
                        }
                    });
                }
                
                const processedDescription = replaceDescription(card.descriptionKo);
                
                cardElement.innerHTML = \`
                    <div class="card-header">
                        <div>
                            <div class="card-id">\${card.id}</div>
                            <h3 class="card-name">\${card.name}</h3>
                            <div class="card-status \${card.isActive !== false ? 'active' : 'inactive'}">\${card.isActive !== false ? '✅ 활성' : '❌ 비활성'}</div>
                        </div>
                        <div class="card-price">\${card.price}</div>
                    </div>
                    <div class="card-description">\${processedDescription}</div>
                    <div class="card-stats">
                        \${isJoker && card.conditionType1 ? \`<div class="stat-item" style="grid-column: 1 / -1;">
                            <span class="stat-label">조건1:</span>
                            <span class="stat-value">\${formatConditionEffect(card.conditionType1, card.conditionValue1, card.effectTiming1, card.effectType1, card.effectTarget1)}</span>
                        </div>\` : ''}
                        \${isJoker && card.conditionType2 ? \`<div class="stat-item" style="grid-column: 1 / -1;">
                            <span class="stat-label">조건2:</span>
                            <span class="stat-value">\${formatConditionEffect(card.conditionType2, card.conditionValue2, card.effectTiming2, card.effectType2, card.effectTarget2)}</span>
                        </div>\` : ''}
                        \${isPlanet ? \`<div class="stat-item">
                            <span class="stat-label">칩 강화:</span>
                            <span class="stat-value">\${card.enhanceChips || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">배율 강화:</span>
                            <span class="stat-value">\${card.enhanceMul || 0}</span>
                        </div>\` : ''}
                        \${isTarot ? \`<div class="stat-item">
                            <span class="stat-label">필요 카드수:</span>
                            <span class="stat-value">\${card.needCardCount || 0}</span>
                        </div>\` : ''}
                    </div>
                    <button class="edit-btn" onclick="openEditModal(\${JSON.stringify(card).replace(/"/g, '&quot;')})">편집</button>
                \`;
                container.appendChild(cardElement);
            });
        }

        function openEditModal(cardData) {
            const card = typeof cardData === 'string' ? JSON.parse(cardData) : cardData;
            console.log('편집할 카드 데이터:', card);
            
            // 디버깅: 조건-효과 쌍 3, 4, 5 데이터 확인
            console.log('조건-효과 쌍 3 데이터:', {
                conditionType3: card.conditionType3,
                conditionValue3: card.conditionValue3,
                conditionOperator3: card.conditionOperator3,
                conditionNumeric3: card.conditionNumeric3,
                effectTiming3: card.effectTiming3,
                effectType3: card.effectType3,
                effectValue3: card.effectValue3,
                effectTarget3: card.effectTarget3
            });
            
            console.log('조건-효과 쌍 4 데이터:', {
                conditionType4: card.conditionType4,
                conditionValue4: card.conditionValue4,
                conditionOperator4: card.conditionOperator4,
                conditionNumeric4: card.conditionNumeric4,
                effectTiming4: card.effectTiming4,
                effectType4: card.effectType4,
                effectValue4: card.effectValue4,
                effectTarget4: card.effectTarget4
            });
            
            console.log('조건-효과 쌍 5 데이터:', {
                conditionType5: card.conditionType5,
                conditionValue5: card.conditionValue5,
                conditionOperator5: card.conditionOperator5,
                conditionNumeric5: card.conditionNumeric5,
                effectTiming5: card.effectTiming5,
                effectType5: card.effectType5,
                effectValue5: card.effectValue5,
                effectTarget5: card.effectTarget5
            });
            document.getElementById('edit-id').value = card.id;
            document.getElementById('edit-name').value = card.name || '';
            document.getElementById('edit-description-ko').value = card.descriptionKo || '';
            
            // 카드 타입에 따라 필드 토글
            const isJoker = card.id.startsWith('joker_');
            const isPlanet = card.id.startsWith('planet_');
            const isTarot = card.id.startsWith('tarot_');
            
            // 모든 카드 타입별 필드 숨기기
            document.getElementById('planet-fields').style.display = 'none';
            document.getElementById('planet-fields-2').style.display = 'none';
            document.getElementById('tarot-fields').style.display = 'none';
            document.getElementById('joker-fields').style.display = 'none';
            
            // 카드 타입에 따라 해당 필드 표시
            if (isPlanet) {
                document.getElementById('planet-fields').style.display = 'block';
                document.getElementById('planet-fields-2').style.display = 'block';
                // 행성카드 데이터 로드
                document.getElementById('edit-enhance-chips').value = card.enhanceChips || '';
                document.getElementById('edit-enhance-mul').value = card.enhanceMul || '';
            } else if (isTarot) {
                document.getElementById('tarot-fields').style.display = 'block';
                // 타로카드 데이터 로드
                document.getElementById('edit-need-card-count').value = card.needCardCount || '';
            } else if (isJoker) {
                document.getElementById('joker-fields').style.display = 'block';
            }
            
            const extraId = document.getElementById('extra-description-id');
            const extraEn = document.getElementById('extra-description-en');
            if (extraId) extraId.value = card.descriptionId || '';
            if (extraEn) extraEn.value = card.descriptionEn || '';
            document.getElementById('edit-price').value = card.price || '';

            document.getElementById('edit-is-active').checked = card.isActive !== false;
            
            // 2개 고정 조건-효과 시스템 필드들
            document.getElementById('condition-type-1').value = card.conditionType1 || '';
            
            // multiple select 값 로드 (쉼표로 구분된 문자열을 배열로 파싱)
            const conditionValue1Select = document.getElementById('condition-value-1');
            if (card.conditionValue1) {
                const values = card.conditionValue1.split(',').map(v => v.trim());
                Array.from(conditionValue1Select.options).forEach(option => {
                    option.selected = values.includes(option.value);
                });
            } else {
                // 값이 없으면 모든 옵션 선택 해제
                Array.from(conditionValue1Select.options).forEach(option => {
                    option.selected = false;
                });
            }
            
            document.getElementById('condition-operator-1').value = card.conditionOperator1 || '';
            document.getElementById('condition-numeric-1').value = card.conditionNumeric1 !== null && card.conditionNumeric1 !== undefined ? card.conditionNumeric1 : '';
            document.getElementById('effect-timing-1').value = card.effectTiming1 || '';
            document.getElementById('effect-type-1').value = card.effectType1 || '';
            document.getElementById('effect-target-1').value = card.effectTarget1 || 'Joker';
            document.getElementById('effect-by-count-1').checked = card.effectByCount1 || false;
            
                            // effectValue1을 우선적으로 로드하고, 없으면 기존 필드에서 로드
            const effectValue1 = card.effectValue1 !== null && card.effectValue1 !== undefined ? card.effectValue1 : 
                               (card.baseValue !== null && card.baseValue !== undefined ? card.baseValue : '');
            document.getElementById('effect-value-1').value = effectValue1;
            
            // 조건 타입에 따른 필드 초기화
            updateConditionFields(1);
            
            // 효과 타입에 따른 효과 값 필드 업데이트
            updateEffectValueField(1);
            
            // effectValue1을 우선적으로 로드하고, 없으면 기존 필드에서 로드
            if (card.effectValue1 !== null && card.effectValue1 !== undefined) {
                document.getElementById('effect-value-1').value = card.effectValue1;
            } else {
                // 기존 로직: 효과 타입에 따라 적절한 값 로드
                if (card.effectType1 === 'GrowBaseValue') {
                    document.getElementById('effect-value-1').value = card.increase !== null && card.increase !== undefined ? card.increase : '';
                } else if (card.effectType1 === 'DecrementBaseValue') {
                    document.getElementById('effect-value-1').value = card.decrease !== null && card.decrease !== undefined ? card.decrease : '';
                } else if (card.effectType1 === 'GrowCardChips') {
                    document.getElementById('effect-value-1').value = card.increase !== null && card.increase !== undefined ? card.increase : '';
                } else {
                    document.getElementById('effect-value-1').value = card.baseValue !== null && card.baseValue !== undefined ? card.baseValue : '';
                }
            }
            
            // 조건-효과 쌍 2 로드
            loadConditionEffectPair(2, card);

            // 조건-효과 쌍 3 로드
            loadConditionEffectPair(3, card);
            
            // 조건-효과 쌍 4 로드
            loadConditionEffectPair(4, card);
            
            // 조건-효과 쌍 5 로드
            loadConditionEffectPair(5, card);
            
            // 추가 버튼 표시 (데이터가 있는 쌍이 2개 미만이면)
            // const visiblePairs = [1, 2, 3, 4, 5].filter(i => {
            //     const container = document.getElementById('condition-effect-pair-' + i + '-container');
            //     return container.style.display === 'block';
            // }).length;
            
            // if (visiblePairs < 5) {
            //     document.getElementById('add-condition-effect-pair-btn').style.display = 'block';
            // } else {
            //     document.getElementById('add-condition-effect-pair-btn').style.display = 'none';
            // }

            document.getElementById('add-condition-effect-pair-btn').style.display = 'block';
            
            document.getElementById('editModal').style.display = 'block';
        }

        // 모달 닫기
        function closeModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        document.getElementById('editForm').onsubmit = async function(e) {
            e.preventDefault();
            
            const cardId = document.getElementById('edit-id').value;
            const isJoker = cardId.startsWith('joker_');
            const isPlanet = cardId.startsWith('planet_');
            const isTarot = cardId.startsWith('tarot_');
            
            const updateData = {
                id: cardId,
                name: document.getElementById('edit-name').value,
                descriptionKo: document.getElementById('edit-description-ko').value,
                // 인도네시아/영어는 추가 번역 저장 버튼으로 별도 처리
                price: parseInt(document.getElementById('edit-price').value) || 0
            };
            
            // 행성카드 데이터 추가
            if (isPlanet) {
                updateData.enhanceChips = parseFloat(document.getElementById('edit-enhance-chips').value) || 0;
                updateData.enhanceMul = parseFloat(document.getElementById('edit-enhance-mul').value) || 0;
            }
            
            // 타로카드 데이터 추가
            if (isTarot) {
                updateData.needCardCount = parseInt(document.getElementById('edit-need-card-count').value) || 0;
            }

            // 활성화 상태 추가
            updateData.isActive = document.getElementById('edit-is-active').checked;
            
            // 새로운 다중 효과/조건 시스템 필드들 추가 (조커 카드에만)
            if (isJoker) {
                // 2개 고정 조건-효과 시스템 필드들
                updateData.conditionType1 = document.getElementById('condition-type-1').value;
                
                // multiple select 값 저장 (선택된 옵션들을 쉼표로 구분된 문자열로 변환)
                const conditionValue1Select = document.getElementById('condition-value-1');
                const selectedValues1 = Array.from(conditionValue1Select.selectedOptions).map(option => option.value);
                updateData.conditionValue1 = selectedValues1.join(', ');
                
                updateData.conditionOperator1 = document.getElementById('condition-operator-1').value;
                updateData.conditionNumeric1 = document.getElementById('condition-numeric-1').value ? parseInt(document.getElementById('condition-numeric-1').value) : null;
                updateData.effectTiming1 = document.getElementById('effect-timing-1').value;
                updateData.effectType1 = document.getElementById('effect-type-1').value;
                // 효과 타입에 따라 적절한 필드에 저장
                const effectValue1 = document.getElementById('effect-value-1').value ? parseFloat(document.getElementById('effect-value-1').value) : null;
                const effectType1 = document.getElementById('effect-type-1').value;
                
                if (effectType1 === 'GrowBaseValue') {
                    updateData.increase = effectValue1;
                } else if (effectType1 === 'DecrementBaseValue') {
                    updateData.decrease = effectValue1;
                } else {
                    updateData.baseValue = effectValue1;
                }
                // effectValue1도 함께 저장
                updateData.effectValue1 = effectValue1;
                updateData.effectTarget1 = document.getElementById('effect-target-1').value;
                updateData.effectByCount1 = document.getElementById('effect-by-count-1').checked;
                
                updateData.conditionType2 = document.getElementById('condition-type-2').value;
                
                // multiple select 값 저장 (선택된 옵션들을 쉼표로 구분된 문자열로 변환)
                const conditionValue2Select = document.getElementById('condition-value-2');
                const selectedValues2 = Array.from(conditionValue2Select.selectedOptions).map(option => option.value);
                updateData.conditionValue2 = selectedValues2.join(', ');
                
                updateData.conditionOperator2 = document.getElementById('condition-operator-2').value;
                updateData.conditionNumeric2 = document.getElementById('condition-numeric-2').value ? parseInt(document.getElementById('condition-numeric-2').value) : null;
                updateData.effectTiming2 = document.getElementById('effect-timing-2').value;
                updateData.effectType2 = document.getElementById('effect-type-2').value;
                // 쌍 2의 효과 타입에 따라 적절한 필드에 저장 (쌍 2가 있을 때만)
                const effectValue2 = document.getElementById('effect-value-2').value ? parseFloat(document.getElementById('effect-value-2').value) : null;
                const effectType2 = document.getElementById('effect-type-2').value;
                
                // 쌍 2에 데이터가 있을 때만 저장
                if (effectType2 && effectValue2 !== null) {
                    if (effectType2 === 'GrowBaseValue') {
                        updateData.increase = effectValue2;
                    } else if (effectType2 === 'DecrementBaseValue') {
                        updateData.decrease = effectValue2;
                    } else {
                        updateData.baseValue = effectValue2;
                    }
                    // effectValue2도 함께 저장
                    updateData.effectValue2 = effectValue2;
                }
                updateData.effectTarget2 = document.getElementById('effect-target-2').value;
                updateData.effectByCount2 = document.getElementById('effect-by-count-2').checked;

                // 조건-효과 쌍 3 데이터 저장
                const conditionType3 = document.getElementById('condition-type-3').value;
                const conditionValue3 = Array.from(document.getElementById('condition-value-3').selectedOptions).map(option => option.value).join(', ');
                const conditionNumeric3 = document.getElementById('condition-numeric-3').value ? parseInt(document.getElementById('condition-numeric-3').value) : null;
                const conditionOperator3 = document.getElementById('condition-operator-3').value;
                const effectTiming3 = document.getElementById('effect-timing-3').value;
                const effectType3 = document.getElementById('effect-type-3').value;
                const effectValue3 = document.getElementById('effect-value-3').value ? parseFloat(document.getElementById('effect-value-3').value) : null;
                const effectTarget3 = document.getElementById('effect-target-3').value;

                // 쌍 3 데이터 저장 (항상 저장)
                updateData.conditionType3 = conditionType3;
                updateData.conditionValue3 = conditionValue3;
                updateData.conditionNumeric3 = conditionNumeric3;
                updateData.conditionOperator3 = conditionOperator3;
                updateData.effectTiming3 = effectTiming3;
                updateData.effectType3 = effectType3;
                updateData.effectValue3 = effectValue3;
                updateData.effectTarget3 = effectTarget3;
                updateData.effectByCount3 = document.getElementById('effect-by-count-3').checked;

                // 조건-효과 쌍 4 데이터 저장
                const conditionType4 = document.getElementById('condition-type-4').value;
                const conditionValue4 = Array.from(document.getElementById('condition-value-4').selectedOptions).map(option => option.value).join(', ');
                const conditionNumeric4 = document.getElementById('condition-numeric-4').value ? parseInt(document.getElementById('condition-numeric-4').value) : null;
                const conditionOperator4 = document.getElementById('condition-operator-4').value;
                const effectTiming4 = document.getElementById('effect-timing-4').value;
                const effectType4 = document.getElementById('effect-type-4').value;
                const effectValue4 = document.getElementById('effect-value-4').value ? parseFloat(document.getElementById('effect-value-4').value) : null;
                const effectTarget4 = document.getElementById('effect-target-4').value;

                // 쌍 4 데이터 저장 (항상 저장)
                updateData.conditionType4 = conditionType4;
                updateData.conditionValue4 = conditionValue4;
                updateData.conditionNumeric4 = conditionNumeric4;
                updateData.conditionOperator4 = conditionOperator4;
                updateData.effectTiming4 = effectTiming4;
                updateData.effectType4 = effectType4;
                updateData.effectValue4 = effectValue4;
                updateData.effectTarget4 = effectTarget4;
                updateData.effectByCount4 = document.getElementById('effect-by-count-4').checked;

                // 조건-효과 쌍 5 데이터 저장
                const conditionType5 = document.getElementById('condition-type-5').value;
                const conditionValue5 = Array.from(document.getElementById('condition-value-5').selectedOptions).map(option => option.value).join(', ');
                const conditionNumeric5 = document.getElementById('condition-numeric-5').value ? parseInt(document.getElementById('condition-numeric-5').value) : null;
                const conditionOperator5 = document.getElementById('condition-operator-5').value;
                const effectTiming5 = document.getElementById('effect-timing-5').value;
                const effectType5 = document.getElementById('effect-type-5').value;
                const effectValue5 = document.getElementById('effect-value-5').value ? parseFloat(document.getElementById('effect-value-5').value) : null;
                const effectTarget5 = document.getElementById('effect-target-5').value;

                // 쌍 5 데이터 저장 (항상 저장)
                updateData.conditionType5 = conditionType5;
                updateData.conditionValue5 = conditionValue5;
                updateData.conditionNumeric5 = conditionNumeric5;
                updateData.conditionOperator5 = conditionOperator5;
                updateData.effectTiming5 = effectTiming5;
                updateData.effectType5 = effectType5;
                updateData.effectValue5 = effectValue5;
                updateData.effectTarget5 = effectTarget5;
                updateData.effectByCount5 = document.getElementById('effect-by-count-5').checked;
            }

            // 디버깅: 저장되는 데이터 확인
            console.log('저장되는 데이터:', updateData);
            
            try {
                const response = await fetch('/dev-tools/cards/api/' + cardId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    showToast('카드가 성공적으로 업데이트되었습니다!');
                    closeModal();
                    loadCards(); // Reload cards to show updated data
                } else {
                    showToast('카드 업데이트에 실패했습니다', true);
                }
            } catch (error) {
                console.error('Failed to update card:', error);
                showToast('카드 업데이트에 실패했습니다', true);
            }
        };

        // 체크박스 값 로드 함수
        function loadCheckboxValues(containerType, jsonString) {
            if (!jsonString) return;
            
            try {
                // 이미 배열인 경우 그대로 사용, 문자열인 경우 파싱
                const values = Array.isArray(jsonString) ? jsonString : JSON.parse(jsonString);
                if (!Array.isArray(values)) return;
                
                const container = document.getElementById(containerType + '-container');
                if (!container) {
                    console.error('컨테이너를 찾을 수 없음:', containerType + '-container');
                    return;
                }
                
                // 모든 체크박스 초기화
                container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // 값에 해당하는 체크박스 체크
                values.forEach(value => {
                                         const checkbox = container.querySelector('input[value="' + value + '"]');
                    if (checkbox) {
                        checkbox.checked = true;
                    } else {
                        console.warn('체크박스를 찾을 수 없음:', value, 'in', containerType);
                    }
                });
                
                                 console.log(containerType + ' 로드 완료:', values);
            } catch (e) {
                                 console.error(containerType + ' JSON 파싱 실패:', e, '원본 데이터:', jsonString);
            }
        }
        
        // 체크박스 값 수집 함수
        function collectCheckboxValues(containerType) {
            const container = document.getElementById(containerType + '-container');
            if (!container) return [];
            
            const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
            return Array.from(checkedBoxes).map(checkbox => checkbox.value);
        }
        

        
        // 토스트 메시지 함수
        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast' + (isError ? ' error' : '');
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        
        // 조건-효과 쌍 추가 함수
        function addConditionEffectPair() {
            // 현재 표시된 조건-효과 쌍 개수 확인
            let currentPair = 1;
            for (let i = 1; i <= 5; i++) {
                if (document.getElementById('condition-effect-pair-' + i + '-container')){
                    if (document.getElementById('condition-effect-pair-' + i + '-container').style.display === 'block') {
                        currentPair = i;
                    }
                }
            }
            
            // 다음 쌍 표시
            const nextPair = currentPair + 1;
            if (nextPair <= 5) {
                document.getElementById('condition-effect-pair-' + nextPair + '-container').style.display = 'block';
                
                // 새로 추가된 쌍의 필드들을 초기화
                updateConditionFields(nextPair);
                updateEffectValueField(nextPair);
                
                // 마지막 쌍이 표시되면 추가 버튼 숨김
                if (nextPair === 5) {
                    document.getElementById('add-condition-effect-pair-btn').style.display = 'none';
                }
            }
        }
        
        // 효과 타입에 따른 효과 값 필드 업데이트 함수
        function updateEffectValueField(pairNumber) {
            const effectType = document.getElementById('effect-type-'+pairNumber).value;
            const effectValue = document.getElementById('effect-value-'+pairNumber);
            
            // 효과 타입에 따라 적절한 값을 로드
            if (effectType === 'GrowBaseValue') {
                // 기본값 성장은 increase 값 사용
                effectValue.value = '';
            } else if (effectType === 'DecrementBaseValue') {
                // 기본값 감소는 decrease 값 사용
                effectValue.value = '';
            } else if (effectType === 'GrowCardChips') {
                // 카드 칩스 성장은 increase 값 사용
                effectValue.value = '';
            } else {
                // 기타 효과들은 baseValue 값 사용
                effectValue.value = '';
            }
        }
        
        // 조건 타입에 따른 필드 활성화/비활성화 함수
        function updateConditionFields(pairNumber) {
            const conditionType = document.getElementById('condition-type-'+pairNumber).value; // {} 형식으로 수정 하지 말것..에러남
            const conditionValue = document.getElementById('condition-value-'+pairNumber); // {} 형식으로 수정 하지 말것..에러남
            const conditionOperator = document.getElementById('condition-operator-'+pairNumber); // {} 형식으로 수정 하지 말것..에러남
            const conditionNumeric = document.getElementById('condition-numeric-'+pairNumber); // {} 형식으로 수정 하지 말것..에러남
            
            // 기본적으로 모든 필드 활성화
            conditionValue.disabled = false;
            conditionOperator.disabled = false;
            conditionNumeric.disabled = false;
            
            // 조건 타입에 따라 필드 비활성화
            switch(conditionType) {
                case 'Always':
                    // Always는 모든 조건 필드 불필요
                    conditionValue.disabled = true;
                    conditionOperator.disabled = true;
                    conditionNumeric.disabled = true;
                    break;
                    
                case 'HasPair':
                case 'HasTriple':
                case 'HasPairInUnUsed':
                case 'HasTripleInUnUsed':
                case 'IsEvenCard':
                case 'IsOddCard':
                    // 불린 조건들은 값, 연산자, 숫자 불필요
                    conditionValue.disabled = true;
                    conditionOperator.disabled = true;
                    conditionNumeric.disabled = true;
                    break;
                    
                case 'CardSuit':
                case 'CardRank':
                case 'HandType':
                case 'UnUsedHandType':
                    // 카드 관련 조건들은 값만 필요
                    conditionOperator.disabled = true;
                    conditionNumeric.disabled = true;
                    break;
                    
                case 'UnUsedSuitCount':
                case 'UsedSuitCount':
                    // 특정 무늬 개수 조건들은 값(무늬), 연산자, 숫자 값 필요
                    conditionOperator.disabled = false;
                    conditionNumeric.disabled = false;
                    break;
                    
                case 'UsedCardCount':
                case 'RemainingCardCount':
                    // 카드 개수 조건들은 값(카드 숫자), 연산자, 숫자 값 필요
                    conditionValue.disabled = false;
                    conditionOperator.disabled = false;
                    conditionNumeric.disabled = false;
                    break;
                    
                case 'DeckCardCount':
                case 'RemainingDeck':
                case 'TotalDeck':
                case 'RemainingDiscards':
                    // 숫자 조건들은 연산자와 숫자 값 필요
                    conditionValue.disabled = true;
                    break;
            }
        }
        
        // 조건-효과 포맷팅 함수
        function formatConditionEffect(conditionType, conditionValue, effectTiming, effectType, effectTarget) {
            if (!conditionType || !effectType) return '';
            
            const typeMap = {
                'CardSuit': '무늬',
                'CardRank': '숫자',
                'HandType': '핸드',
                'HasPair': '페어 포함',
                'HasTriple': '트리플 포함',
                'HasPairInUnUsed': '미사용 페어',
                'HasTripleInUnUsed': '미사용 트리플',
                'UnUsedHandType': '미사용 핸드',
                'UnUsedSuitCount': '미사용 무늬 수',
                'UsedCardCount': '사용된 카드',
                'RemainingCardCount': '미사용 카드',
                'DeckCardCount': '덱 안에 카드',
                'RemainingDeck': '남은 덱',
                'TotalDeck': '전체 덱',
                'UsedSuitCount': '사용된 무늬 수',
                'RemainingDiscards': '남은 버리기',
                'IsEvenCard': '짝수 카드',
                'IsOddCard': '홀수 카드',
                'Always': '항상 참'
            };
            
            const valueMap = {
                'Hearts': '하트',
                'Diamonds': '다이아몬드',
                'Clubs': '클럽',
                'Spades': '스페이드',
                'Ace': '1',
                'King': '13',
                'Queen': '12',
                'Jack': '11',
                'Ten': '10',
                'Nine': '9',
                'Eight': '8',
                'Seven': '7',
                'Six': '6',
                'Five': '5',
                'Four': '4',
                'Three': '3',
                'Two': '2',
                'HighCard': '하이카드',
                'OnePair': '원페어',
                'TwoPair': '투페어',
                'ThreeOfAKind': '트리플',
                'Straight': '스트레이트',
                'Flush': '플러시',                
                'FullHouse': '풀하우스',
                'FourOfAKind': '포카드',                
                'StraightFlush': '스트레이트 플러시',
            };
            
            const timingMap = {
                'OnScoring': '득점 시',
                'OnHandPlay': '핸드플레이 시',
                'OnAfterScoring': '득점 후'
            };
            
            const effectMap = {
                'AddMultiplier': '배수+',
                'AddMultiplierByRandomValue': '랜덤×배수+',
                'MulMultiplier': '배수×',
                'AddChips': '칩+',
                'MulChips': '칩×',
                'GrowBaseValue': '기본값↑',
                'DecrementBaseValue': '기본값↓',
                'GrowCardChips': '카드칩스↑'
            };
            
            const targetMap = {
                'Card': '카드',
                'Joker': '조커'
            };
            
            const type = typeMap[conditionType] || conditionType;
            
            // 조건값이 쉼표나 슬래시로 구분된 여러 값인지 확인
            let value = '';
            if (conditionValue) {
                // 쉼표나 슬래시로 구분된 여러 값인지 확인
                const separator = conditionValue.includes(',') ? ',' : (conditionValue.includes('/') ? '/' : null);
                if (separator) {
                    // 여러 값으로 구분된 경우
                    const values = conditionValue.split(separator).map(v => v.trim()).filter(Boolean);
                    console.log('[formatConditionEffect] 여러 값 감지:', conditionValue, '->', values.join(', '));
                    if (values.length > 1) {
                        const firstValue = valueMap[values[0]] || values[0];
                        const remainingCount = values.length - 1;
                        value = firstValue + ' 외 ' + remainingCount + '개';
                        console.log('[formatConditionEffect] "외 x개" 형태로 변환:', value);
                    } else {
                        value = valueMap[conditionValue] || conditionValue;
                    }
                } else {
                    // 단일 값인 경우
                    value = valueMap[conditionValue] || conditionValue;
                    console.log('[formatConditionEffect] 단일 값:', conditionValue, '->', value);
                }
            }
            
            const timing = effectTiming ? (timingMap[effectTiming] || effectTiming) : '';
            const effect = effectMap[effectType] || effectType;
            const target = effectTarget ? (targetMap[effectTarget] || effectTarget) : '';
            
                         let result = type;
             if (value) result += ':' + value;
             result += ' → ' + effect;
             if (timing) result += ' [' + timing + ']';
            
            return result;
        }
        
        // 모달 외부 클릭 시 닫기
        window.onclick = function(event) {
            const modal = document.getElementById('editModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // 조건-효과 쌍 로드 함수
        function loadConditionEffectPair(pairNumber, card) {
            const hasData = card['conditionType' + pairNumber] || card['conditionValue' + pairNumber] || 
                card['conditionOperator' + pairNumber] || card['conditionNumeric' + pairNumber] || 
                card['effectTiming' + pairNumber] || card['effectType' + pairNumber] || 
                card['effectTarget' + pairNumber];
            
            console.log('조건-효과 쌍 ' + pairNumber + ' 로드:', {
                pairNumber: pairNumber,
                hasData: hasData,
                conditionType: card['conditionType' + pairNumber],
                conditionValue: card['conditionValue' + pairNumber],
                conditionOperator: card['conditionOperator' + pairNumber],
                conditionNumeric: card['conditionNumeric' + pairNumber],
                effectTiming: card['effectTiming' + pairNumber],
                effectType: card['effectType' + pairNumber],
                effectTarget: card['effectTarget' + pairNumber]
            });
            
            const container = document.getElementById('condition-effect-pair-' + pairNumber + '-container');
            
            if (hasData) {
                // 데이터가 있으면 표시
                container.style.display = 'block';
                
                // 값 설정
                document.getElementById('condition-type-' + pairNumber).value = card['conditionType' + pairNumber] || '';
                
                // multiple select 값 로드
                const conditionValueSelect = document.getElementById('condition-value-' + pairNumber);
                if (card['conditionValue' + pairNumber]) {
                    let values;
                    // 배열인 경우와 문자열인 경우 모두 처리
                    if (Array.isArray(card['conditionValue' + pairNumber])) {
                        values = card['conditionValue' + pairNumber];
                    } else {
                        values = card['conditionValue' + pairNumber].split(',').map(v => v.trim());
                    }
                    
                    console.log('조건값 로드:', {
                        pairNumber: pairNumber,
                        rawValue: card['conditionValue' + pairNumber],
                        parsedValues: values
                    });
                    
                    Array.from(conditionValueSelect.options).forEach(option => {
                        option.selected = values.includes(option.value);
                    });
                } else {
                    Array.from(conditionValueSelect.options).forEach(option => {
                        option.selected = false;
                    });
                }
                
                document.getElementById('condition-operator-' + pairNumber).value = card['conditionOperator' + pairNumber] || '';
                document.getElementById('condition-numeric-' + pairNumber).value = card['conditionNumeric' + pairNumber] !== null && card['conditionNumeric' + pairNumber] !== undefined ? card['conditionNumeric' + pairNumber] : '';
                document.getElementById('effect-timing-' + pairNumber).value = card['effectTiming' + pairNumber] || '';
                document.getElementById('effect-type-' + pairNumber).value = card['effectType' + pairNumber] || '';
                document.getElementById('effect-target-' + pairNumber).value = card['effectTarget' + pairNumber] || 'Joker';
                document.getElementById('effect-by-count-' + pairNumber).checked = card['effectByCount' + pairNumber] || false;
                
                // 조건 타입에 따른 필드 초기화
                updateConditionFields(pairNumber);
                
                // 효과 타입에 따른 효과 값 필드 업데이트
                updateEffectValueField(pairNumber);
                
                // effectValue 로드
                if (card['effectValue' + pairNumber] !== null && card['effectValue' + pairNumber] !== undefined) {
                    document.getElementById('effect-value-' + pairNumber).value = card['effectValue' + pairNumber];
                } else {
                    // 기존 로직: 효과 타입에 따라 적절한 값 로드
                    if (card['effectType' + pairNumber] === 'GrowBaseValue') {
                        document.getElementById('effect-value-' + pairNumber).value = card.increase !== null && card.increase !== undefined ? card.increase : '';
                    } else if (card['effectType' + pairNumber] === 'DecrementBaseValue') {
                        document.getElementById('effect-value-' + pairNumber).value = card.decrease !== null && card.decrease !== undefined ? card.decrease : '';
                    } else if (card['effectType' + pairNumber] === 'GrowCardChips') {
                        document.getElementById('effect-value-' + pairNumber).value = card.increase !== null && card.increase !== undefined ? card.increase : '';
                    } else {
                        document.getElementById('effect-value-' + pairNumber).value = card.baseValue !== null && card.baseValue !== undefined ? card.baseValue : '';
                    }
                }
            } else {
                // 데이터가 없으면 숨김
                container.style.display = 'none';
                
                // 필드들 초기화
                document.getElementById('condition-type-' + pairNumber).value = '';
                document.getElementById('condition-value-' + pairNumber).value = '';
                document.getElementById('condition-operator-' + pairNumber).value = '';
                document.getElementById('condition-numeric-' + pairNumber).value = '';
                document.getElementById('effect-timing-' + pairNumber).value = '';
                document.getElementById('effect-type-' + pairNumber).value = '';
                document.getElementById('effect-value-' + pairNumber).value = '';
                document.getElementById('effect-target-' + pairNumber).value = '';
                document.getElementById('effect-by-count-' + pairNumber).checked = false;
            }
        }
    </script>
</body>
</html>
        `);
    }
} 