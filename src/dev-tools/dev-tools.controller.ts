import { Controller, Get, Post, Put, Delete, Body, Param, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { DevToolsService } from './dev-tools.service';
import { FeedbackService, CreateFeedbackDto, UpdateFeedbackDto } from './feedback.service';
import { CardUpdateDto, ChipRechargeDto } from './dto/card-update.dto';
// import { ApkUploadDto } from './dto/apk.dto';

@Controller('dev-tools')
export class DevToolsController {
    constructor(
        private readonly devToolsService: DevToolsService,
        private readonly feedbackService: FeedbackService
    ) { }

    @Get()
    getDevToolsPage(@Res() res: Response) {
        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Tools - Card Editor</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            margin: -20px -20px 20px -20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .card-section { 
            margin-bottom: 40px; 
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card-section h2 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .card-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
            transition: all 0.3s ease;
            position: relative;
        }
        .card-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .card-id {
            font-size: 0.8em;
            color: #666;
            font-family: 'Courier New', monospace;
            background: #e8e8e8;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .card-name {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        .card-price {
            background: #4CAF50;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .card-status {
            font-size: 12px;
            margin-top: 5px;
            padding: 2px 6px;
            border-radius: 3px;
            background: #f0f0f0;
            display: inline-block;
        }
        .card-status.active {
            background: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }
        .card-status.inactive {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #f44336;
        }
        .card-description {
            color: #555;
            font-size: 0.95em;
            line-height: 1.4;
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-left: 4px solid #667eea;
        }
        .card-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 10px 0;
            font-size: 0.85em;
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 8px;
            background: white;
            border-radius: 4px;
        }
        .stat-label {
            color: #666;
            font-weight: 500;
        }
        .stat-value {
            color: #333;
            font-weight: bold;
        }
        .edit-btn { 
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white; 
            padding: 8px 16px; 
            border: none; 
            cursor: pointer; 
            border-radius: 5px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .edit-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }
        .save-btn { 
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white; 
            padding: 8px 16px; 
            border: none; 
            cursor: pointer; 
            border-radius: 5px;
            font-weight: 500;
        }
        .cancel-btn { 
            background: linear-gradient(45deg, #f44336, #d32f2f);
            color: white; 
            padding: 8px 16px; 
            border: none; 
            cursor: pointer; 
            border-radius: 5px;
            font-weight: 500;
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
            backdrop-filter: blur(5px);
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
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .form-group { 
            margin-bottom: 15px; 
        }
        .form-group.full-width {
            grid-column: 1 / -1;
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
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 개발 도구</h1>
    </div>
    
    <!-- Feedback Section -->
    <div class="card-section">
        <h2>💬 피드백</h2>
        <div style="margin-bottom: 20px;">
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button onclick="addFeedback()" style="background: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">피드백 작성</button>
            </div>
            <textarea id="feedback-content" placeholder="게임 테스트 중 발견한 문제점이나 개선사항을 작성해주세요..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        </div>
        <div id="feedback-list" style="margin-top: 20px;"></div>
    </div>
    
    <!-- Chip Recharge Section -->
    <div class="card-section">
        <h2>💰 테스트 칩 충전</h2>
        <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px; align-items: center;">
                                        <label style="font-weight: 600; color: #333;">골드칩:</label>
                <input type="number" id="gold-chip-amount" value="1000" min="0" style="width: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <label style="font-weight: 600; color: #333;">유저 선택:</label>
                <select id="user-select" style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="all">모든 유저</option>
                </select>
            </div>
            <button onclick="rechargeChips()" style="background: linear-gradient(45deg, #4CAF50, #45a049); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">칩 충전</button>
        </div>
        <div id="recharge-result" style="margin-top: 10px;"></div>
    </div>

    <!-- APK Upload Section -->
    <div class="card-section">
        <h2>📱 APK 업로드</h2>
        <form id="apk-upload-form" enctype="multipart/form-data" style="margin-bottom: 15px;">
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label style="font-weight: 600; color: #333; min-width: 80px;">APK 파일:</label>
                    <input type="file" id="apk-file" name="file" accept=".apk" required style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex: 1;">
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label style="font-weight: 600; color: #333; min-width: 80px;">코멘트:</label>
                    <input type="text" id="apk-comment" name="comment" placeholder="업로드 코멘트를 입력하세요" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex: 1;">
                </div>
                <button type="submit" style="background: linear-gradient(45deg, #2196F3, #1976D2); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 500; width: fit-content;">APK 업로드</button>
            </div>
        </form>
        <div id="apk-upload-result"></div>
    </div>

    <!-- Game Settings Management Section -->
    <div class="card-section">
        <h2>⚙️ 게임 설정 관리</h2>
        <div>
            <h3 style="color: #333; margin-bottom: 15px;">게임 설정 목록</h3>
            <div id="game-settings-list" style="margin-top: 10px;"></div>
        </div>
    </div>
    
    <div id="cards-container">
        <div class="card-section">
            <h2>🃏 조커 카드</h2>
            <div id="joker-cards" class="cards-grid"></div>
        </div>
        <div class="card-section">
            <h2>🌍 행성 카드</h2>
            <div id="planet-cards" class="cards-grid"></div>
        </div>
        <div class="card-section">
            <h2>🔮 타로 카드</h2>
            <div id="tarot-cards" class="cards-grid"></div>
        </div>
    </div>

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
                        <div class="form-group full-width">
                            <label>설명:</label>
                            <textarea id="edit-description"></textarea>
                        </div>
                        <div class="form-group">
                            <label>가격:</label>
                            <input type="number" id="edit-price">
                        </div>
                        <div class="form-group">
                            <label>기본값:</label>
                            <input type="number" id="edit-basevalue" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>증가값:</label>
                            <input type="number" id="edit-increase" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>감소값:</label>
                            <input type="number" id="edit-decrease" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>최대값:</label>
                            <input type="number" id="edit-maxvalue">
                        </div>

                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="edit-is-active">
                            <label for="edit-is-active">활성화</label>
                        </div>
                    </div>
            </form>
            <div class="modal-actions">
                <button type="button" class="cancel-btn" onclick="closeModal()">취소</button>
                <button type="submit" form="editForm" class="save-btn">저장</button>
            </div>
            </form>
        </div>
    </div>

    <script>
        let currentCards = {};

        async function loadCards() {
            try {
                const response = await fetch('/dev-tools/cards');
                const data = await response.json();
                currentCards = data;
                renderCards();
            } catch (error) {
                console.error('Failed to load cards:', error);
            }
        }

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
                            case 'baseValue':
                                return card.baseValue || 0;
                            case 'increase':
                                return card.increase || 0;
                            case 'decrease':
                                return card.decrease || 0;
                            case 'enhanceChips':
                                return card.enhanceChips || 0;
                            case 'enhanceMul':
                                return card.enhanceMul || 0;
                            case 'needCardCount':
                                return card.needCardCount || 0;
                            case 'maxValue':
                                return card.maxValue || 0;
                            case 'level':
                                return '1'; // 임시로 1로 표시
                            default:
                                return match; // 알 수 없는 플레이스홀더는 그대로 유지
                        }
                    });
                }
                
                cardElement.innerHTML = \`
                    <div class="card-header">
                        <div>
                            <div class="card-id">\${card.id}</div>
                            <h3 class="card-name">\${card.name}</h3>
                            <div class="card-status \${card.isActive !== false ? 'active' : 'inactive'}">\${card.isActive !== false ? '✅ 활성' : '❌ 비활성'}</div>
                        </div>
                        <div class="card-price">\${card.price}</div>
                    </div>
                    <div class="card-description">\${replaceDescription(card.description)}</div>
                    <div class="card-stats">
                        \${isJoker ? \`<div class="stat-item">
                            <span class="stat-label">기본값:</span>
                            <span class="stat-value">\${card.baseValue || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">증가값:</span>
                            <span class="stat-value">\${card.increase || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">감소값:</span>
                            <span class="stat-value">\${card.decrease || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">최대값:</span>
                            <span class="stat-value">\${card.maxValue || 0}</span>
                        </div>\` : ''}
                        \${isTarot ? \`<div class="stat-item">
                            <span class="stat-label">필요 카드수:</span>
                            <span class="stat-value">\${card.needCardCount || 0}</span>
                        </div>\` : ''}
                        \${isPlanet ? \`\` : ''}
                    </div>
                    <button class="edit-btn" onclick="openEditModal(\${JSON.stringify(card).replace(/"/g, '&quot;')})">편집</button>
                \`;
                
                container.appendChild(cardElement);
            });
        }

        function openEditModal(cardData) {
            const card = typeof cardData === 'string' ? JSON.parse(cardData) : cardData;
            document.getElementById('edit-id').value = card.id;
            document.getElementById('edit-name').value = card.name || '';
            document.getElementById('edit-description').value = card.description || '';
            document.getElementById('edit-price').value = card.price || '';
            document.getElementById('edit-basevalue').value = card.baseValue || '';
            document.getElementById('edit-increase').value = card.increase || '';
            document.getElementById('edit-decrease').value = card.decrease || '';
            document.getElementById('edit-maxvalue').value = card.maxValue || '';

            document.getElementById('edit-is-active').checked = card.isActive !== false;
            
            // 카드 타입에 따라 필드 표시/숨김
            const isJoker = card.id.startsWith('joker_');
            const isPlanet = card.id.startsWith('planet_');
            const isTarot = card.id.startsWith('tarot_');
            

            
            document.getElementById('editModal').style.display = 'block';
        }

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
                description: document.getElementById('edit-description').value,
                price: parseInt(document.getElementById('edit-price').value) || 0
            };
            
            // 조커 카드인 경우 기본값, 증가값, 감소값, 최대값 추가
            if (isJoker) {
                updateData.baseValue = parseFloat(document.getElementById('edit-basevalue').value) || 0;
                updateData.increase = parseFloat(document.getElementById('edit-increase').value) || 0;
                updateData.decrease = parseFloat(document.getElementById('edit-decrease').value) || 0;
                updateData.maxValue = parseInt(document.getElementById('edit-maxvalue').value) || 0;
            }
            


            // 활성화 상태 추가
            updateData.isActive = document.getElementById('edit-is-active').checked;

            try {
                const response = await fetch(\`/dev-tools/cards/\${cardId}\`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    alert('카드가 성공적으로 업데이트되었습니다!');
                    closeModal();
                    loadCards(); // Reload cards to show updated data
                } else {
                    alert('카드 업데이트에 실패했습니다');
                }
            } catch (error) {
                console.error('Failed to update card:', error);
                alert('카드 업데이트에 실패했습니다');
            }
        };

        // 칩 충전 함수
        async function rechargeChips() {
            const goldChips = parseInt(document.getElementById('gold-chip-amount').value) || 0;
            const userSelect = document.getElementById('user-select').value;
            
            if (silverChips < 0) {
                document.getElementById('recharge-result').innerHTML = '<div class="error">칩 수량은 0 이상이어야 합니다.</div>';
                return;
            }
            
            try {
                const response = await fetch('/dev-tools/recharge-chips', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                                    body: JSON.stringify({
                    goldChips: goldChips,
                    userSelect: userSelect
                })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success) {
                        let message = \`<div style="background: #e8f5e8; color: #2e7d32; padding: 10px; border-radius: 4px; border: 1px solid #4caf50;">✅ \${result.message}</div>\`;
                        
                        if (result.onlineUsers && result.onlineUsers.length > 0) {
                            message += \`<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin-top: 10px;">
                                <strong>게임 접속 중인 유저:</strong> \${result.onlineUsers.join(', ')}
                            </div>\`;
                        }
                        
                        document.getElementById('recharge-result').innerHTML = message;
                    } else {
                        let message = \`<div class="error">❌ \${result.message}</div>\`;
                        
                        if (result.onlineUsers && result.onlineUsers.length > 0) {
                            message += \`<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin-top: 10px;">
                                <strong>게임 접속 중인 유저:</strong> \${result.onlineUsers.join(', ')}
                            </div>\`;
                        }
                        
                        document.getElementById('recharge-result').innerHTML = message;
                    }
                } else {
    document.getElementById('recharge-result').innerHTML = '<div class="error">칩 충전에 실패했습니다.</div>';
}
            } catch (error) {
    console.error('Failed to recharge chips:', error);
    document.getElementById('recharge-result').innerHTML = '<div class="error">칩 충전 중 오류가 발생했습니다.</div>';
}
        }

// Load cards when page loads
loadCards();

// 유저 목록 로드
loadUsers();

// APK 업로드 섹션만 사용 (목록/다운로드/삭제는 제거)

// 게임 설정 목록 로드
loadGameSettings();

// 유저 목록 로드 함수
async function loadUsers() {
    try {
        const response = await fetch('/dev-tools/users');
        const users = await response.json();

        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = '<option value="all">모든 유저</option>';

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = \`\${user.userId} (\${user.nickname || '닉네임 없음'}) - 골드칩: \${user.goldChip}\`;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// APK 업로드 폼 이벤트 리스너
document.getElementById('apk-upload-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('apk-file');
    const commentInput = document.getElementById('apk-comment');
    
    if (fileInput.files.length === 0) {
        document.getElementById('apk-upload-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">APK 파일을 선택해주세요.</div>';
        return;
    }
    
    formData.append('file', fileInput.files[0]);
    formData.append('comment', commentInput.value);
    
    try {
        const response = await fetch('/dev-tools/apk/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('apk-upload-result').innerHTML = \`<div style="background: #e8f5e8; color: #2e7d32; padding: 10px; border-radius: 4px; border: 1px solid #4caf50;">✅ APK 업로드 성공: \${result.originalName}</div>\`;
            fileInput.value = '';
            commentInput.value = '';
            loadApkList();
        } else {
            const error = await response.json();
            document.getElementById('apk-upload-result').innerHTML = \`<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">❌ APK 업로드 실패: \${error.message}</div>\`;
        }
    } catch (error) {
        console.error('APK upload failed:', error);
        document.getElementById('apk-upload-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">APK 업로드 중 오류가 발생했습니다.</div>';
    }
});

// APK 목록 로드
async function loadApkList() {
    try {
        const response = await fetch('/dev-tools/apk/list');
        const apks = await response.json();
        
        const apkListDiv = document.getElementById('apk-list');
        
        if (apks.length === 0) {
            apkListDiv.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">업로드된 APK가 없습니다.</div>';
            return;
        }
        
        let html = '<div style="display: grid; gap: 15px;">';
        apks.forEach(apk => {
            const uploadDate = new Date(apk.uploadDate).toLocaleString('ko-KR');
            const fileSize = (apk.size / (1024 * 1024)).toFixed(2);
            
            html += \`
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: #333;">\${apk.originalName}</h4>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="downloadApk('\${apk.id}')" style="background: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">다운로드</button>
                            <button onclick="deleteApk('\${apk.id}')" style="background: #f44336; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                        </div>
                    </div>
                    <div style="color: #666; font-size: 14px;">
                        <div><strong>코멘트:</strong> \${apk.comment}</div>
                        <div><strong>업로드 날짜:</strong> \${uploadDate}</div>
                        <div><strong>파일 크기:</strong> \${fileSize} MB</div>
                    </div>
                </div>
            \`;
        });
        html += '</div>';
        
        apkListDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to load APK list:', error);
        document.getElementById('apk-list').innerHTML = '<div style="color: #f44336;">APK 목록을 불러오는데 실패했습니다.</div>';
    }
}

// APK 다운로드
async function downloadApk(apkId) {
    const downloadButton = event.target;
    const originalText = downloadButton.textContent;
    
    try {
        // 다운로드 버튼 상태 변경
        downloadButton.textContent = '다운로드 중...';
        downloadButton.disabled = true;
        
        const response = await fetch(\`/dev-tools/apk/download/\${apkId}\`);
        
        if (response.ok) {
            // Content-Length 헤더에서 파일 크기 확인
            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength) : 0;
            
            // ReadableStream을 사용하여 진행률 추적
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                // 진행률 업데이트 (1MB마다)
                if (totalSize > 0 && receivedLength % (1024 * 1024) < value.length) {
                    const progress = Math.round((receivedLength / totalSize) * 100);
                    downloadButton.textContent = \`다운로드 중... \${progress}%\`;
                }
            }
            
            // Blob 생성 및 다운로드
            const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'app.apk';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // 성공 메시지
            downloadButton.textContent = '다운로드 완료!';
            setTimeout(() => {
                downloadButton.textContent = originalText;
                downloadButton.disabled = false;
            }, 2000);
            
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(\`APK 다운로드에 실패했습니다: \${errorData.message || '알 수 없는 오류'}\`);
            downloadButton.textContent = originalText;
            downloadButton.disabled = false;
        }
    } catch (error) {
        console.error('APK download failed:', error);
        alert('APK 다운로드 중 오류가 발생했습니다.');
        downloadButton.textContent = originalText;
        downloadButton.disabled = false;
    }
}

// APK 삭제
async function deleteApk(apkId) {
    if (!confirm('정말로 이 APK를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(\`/dev-tools/apk/delete/\${apkId}\`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadApkList();
        } else {
            const error = await response.json();
            alert(\`APK 삭제 실패: \${error.message}\`);
        }
    } catch (error) {
        console.error('APK delete failed:', error);
        alert('APK 삭제 중 오류가 발생했습니다.');
    }
}

// 게임 설정 목록 로드 함수
async function loadGameSettings() {
    try {
        const response = await fetch('/dev-tools/game-settings');
        const settings = await response.json();
        
        const settingsListDiv = document.getElementById('game-settings-list');
        
        if (settings.length === 0) {
            settingsListDiv.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">등록된 게임 설정이 없습니다.</div>';
            return;
        }
        
        let html = '<div style="display: grid; gap: 15px;">';
        settings.forEach(setting => {
            const createdDate = new Date(setting.createdAt).toLocaleString('ko-KR');
            const updatedDate = new Date(setting.updatedAt).toLocaleString('ko-KR');
            
            // roundRankFunds 설정인 경우 특별한 표시
            if (setting.name === 'roundRankFunds') {
                try {
                    const roundRankData = JSON.parse(setting.value);
                    html += \`
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 5px 0; color: #333;">\${setting.name}</h4>
                                    <div style="font-size: 14px; color: #555; margin-bottom: 10px;">\${setting.description || '설명 없음'}</div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button onclick="editGameSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 10px;">
                    \`;
                    
                    for (let round = 1; round <= 5; round++) {
                        html += \`
                            <div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: white;">
                                <div style="font-weight: bold; text-align: center; margin-bottom: 8px; color: #333;">\${round}라운드</div>
                        \`;
                        
                        for (let rank = 1; rank <= 4; rank++) {
                            const value = roundRankData[round]?.[rank] || 0;
                            html += \`
                                <div style="font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                    <span>\${rank}등:</span>
                                    <span style="font-weight: bold;">\${value}</span>
                                </div>
                            \`;
                        }
                        
                        html += \`</div>\`;
                    }
                    
                    html += \`
                            </div>
                            <div style="text-align: right; font-size: 12px; color: #666;">수정일: \${updatedDate}</div>
                        </div>
                    \`;
                } catch (e) {
                    // JSON 파싱 실패 시 일반 표시
                    html += \`
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 5px 0; color: #333;">\${setting.name}</h4>
                                    <div style="font-size: 14px; color: #555; margin-bottom: 10px;">\${setting.description || '설명 없음'}</div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button onclick="editGameSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                                <div>
                                    <strong>설정값:</strong>
                                    <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace;">\${setting.value}</div>
                                </div>
                                <div>
                                    <strong>수정일:</strong>
                                    <div style="font-size: 12px; color: #666;">\${updatedDate}</div>
                                </div>
                            </div>
                        </div>
                    \`;
                }
            } else {
                // 일반 설정 표시
                html += \`
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0; color: #333;">\${setting.name}</h4>
                                <div style="font-size: 14px; color: #555; margin-bottom: 10px;">\${setting.description || '설명 없음'}</div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="editGameSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                            </div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>설정값:</strong>
                            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace;">\${setting.value}</div>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #666;">수정일: \${updatedDate}</div>
                    </div>
                \`;
            }
        });
        html += '</div>';
        
        settingsListDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to load game settings:', error);
        document.getElementById('game-settings-list').innerHTML = '<div style="color: #f44336;">게임 설정 목록을 불러오는데 실패했습니다.</div>';
    }
}

// 게임 설정 편집 함수
async function editGameSetting(settingId) {
    try {
        const response = await fetch(\`/dev-tools/game-settings/\${settingId}\`);
        const result = await response.json();
        
        if (!result.success) {
            alert('게임 설정을 찾을 수 없습니다.');
            return;
        }
        
        const setting = result.data;
        
        // roundRankFunds 설정인 경우 특별한 편집 UI 제공
        if (setting.name === 'roundRankFunds') {
            await editRoundRankFunds(setting);
            return;
        }
        
        // 일반 설정 편집
        const newValue = prompt('새로운 설정값을 입력하세요:', setting.value);
        if (newValue === null) return; // 취소
        
        const newDescription = prompt('설정 설명을 입력하세요:', setting.description || '');
        if (newDescription === null) return; // 취소
        
        const updateResponse = await fetch(\`/dev-tools/game-settings/\${settingId}\`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: newValue,
                description: newDescription
            })
        });
        
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            alert('✅ ' + result.message);
            loadGameSettings();
        } else {
            const error = await updateResponse.json();
            alert('❌ ' + error.message);
        }
    } catch (error) {
        console.error('Game setting edit failed:', error);
        alert('게임 설정 편집 중 오류가 발생했습니다.');
    }
}

// 라운드별 등수 funds 편집 함수
async function editRoundRankFunds(setting) {
    try {
        let roundRankData;
        try {
            roundRankData = JSON.parse(setting.value);
        } catch (e) {
            roundRankData = {
                "1": { "1": 100, "2": 50, "3": 25, "4": 10 },
                "2": { "1": 150, "2": 75, "3": 40, "4": 15 },
                "3": { "1": 200, "2": 100, "3": 50, "4": 20 },
                "4": { "1": 250, "2": 125, "3": 60, "4": 25 },
                "5": { "1": 300, "2": 150, "3": 75, "4": 30 }
            };
        }
        
        // 편집 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        \`;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = \`
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        \`;
        
        let html = \`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #667eea;">
                <h2 style="margin: 0; color: #333;">라운드별 등수 Funds 설정</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="margin-bottom: 20px;">
                <p style="color: #666; margin: 0;">각 라운드별로 1등부터 4등까지의 지급 funds를 설정하세요.</p>
            </div>
        \`;
        
        // 1-5라운드, 1-4등 입력창 생성
        for (let round = 1; round <= 5; round++) {
            html += \`
                <div style="margin-bottom: 25px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">
                    <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">\${round}라운드</h3>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            \`;
            
            for (let rank = 1; rank <= 4; rank++) {
                const value = roundRankData[round]?.[rank] || 0;
                html += \`
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">\${rank}등:</label>
                        <input type="number" 
                               id="round_\${round}_rank_\${rank}" 
                               value="\${value}" 
                               min="0" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
                    </div>
                \`;
            }
            
            html += \`
                    </div>
                </div>
            \`;
        }
        
        html += \`
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <button onclick="this.closest('.modal').remove()" style="background: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">취소</button>
                <button onclick="saveRoundRankFunds('\${setting.id}')" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">저장</button>
            </div>
        \`;
        
        modalContent.innerHTML = html;
        modal.appendChild(modalContent);
        modal.className = 'modal';
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Round rank funds edit failed:', error);
        alert('라운드별 등수 funds 편집 중 오류가 발생했습니다.');
    }
}

// 라운드별 등수 funds 저장 함수
async function saveRoundRankFunds(settingId) {
    try {
        const roundRankData = {};
        
        // 모든 입력값 수집
        for (let round = 1; round <= 5; round++) {
            roundRankData[round] = {};
            for (let rank = 1; rank <= 4; rank++) {
                const input = document.getElementById(\`round_\${round}_rank_\${rank}\`);
                if (input) {
                    roundRankData[round][rank] = parseInt(input.value) || 0;
                }
            }
        }
        
        const updateResponse = await fetch(\`/dev-tools/game-settings/\${settingId}\`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: JSON.stringify(roundRankData)
            })
        });
        
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            alert('✅ ' + result.message);
            // 성공 메시지 확인 후 모달 닫기
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
            loadGameSettings();
        } else {
            const error = await updateResponse.json();
            alert('❌ ' + error.message);
        }
    } catch (error) {
        console.error('Save round rank funds failed:', error);
        alert('라운드별 등수 funds 저장 중 오류가 발생했습니다.');
    }
}

// 피드백 관련 함수들
async function loadFeedbacks() {
    try {
        const response = await fetch('/dev-tools/feedback');
        const feedbacks = await response.json();
        renderFeedbacks(feedbacks);
    } catch (error) {
        console.error('Failed to load feedbacks:', error);
        document.getElementById('feedback-list').innerHTML = '<div style="color: #f44336;">피드백 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderFeedbacks(feedbacks) {
    const feedbackListDiv = document.getElementById('feedback-list');
    if (feedbacks.length === 0) {
        feedbackListDiv.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">등록된 피드백이 없습니다.</div>';
        return;
    }



    @Post('apk/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadApk(@UploadedFile() file: Express.Multer.File, @Body('comment') comment: string) {
        if (!file) {
            return { success: false, message: '파일이 없습니다.' };
        }
        const uploadDir = path.join(process.cwd(), 'uploads', 'apk');
        try {
            fs.mkdirSync(uploadDir, { recursive: true });
            const savedPath = path.join(uploadDir, file.originalname);
            fs.writeFileSync(savedPath, file.buffer);
            return { success: true, originalName: file.originalname, size: file.size, comment: comment || '' };
        } catch (e) {
            return { success: false, message: '파일 저장 실패' };
        }
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    feedbacks.forEach(feedback => {
        const createdAt = new Date(feedback.createdAt).toLocaleString('ko-KR');
        html += \`
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="color: #666; font-size: 12px;">\${createdAt}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">

                        <button onclick="showReplyForm('\${feedback.id}')" style="background: #2196F3; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">답글</button>
                        <button onclick="deleteFeedback('\${feedback.id}')" style="background: #f44336; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                    </div>
                </div>
                <div id="feedback-content-\${feedback.id}" style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 10px; white-space: pre-wrap;">\${feedback.content}</div>

                <div id="reply-form-\${feedback.id}" style="display: none; margin-top: 10px;">
                    <textarea id="reply-content-\${feedback.id}" placeholder="답글을 입력하세요..." style="width: 100%; height: 60px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-size: 12px;"></textarea>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button onclick="addReply('\${feedback.id}')" style="background: #4CAF50; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">답글 작성</button>
                        <button onclick="hideReplyForm('\${feedback.id}')" style="background: #666; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">취소</button>
                    </div>
                </div>
                <div id="replies-\${feedback.id}" style="margin-left: 20px; margin-top: 10px;">
        \`;
        
        if (feedback.replies && feedback.replies.length > 0) {
            feedback.replies.forEach(reply => {
                const replyCreatedAt = new Date(reply.createdAt).toLocaleString('ko-KR');
                html += \`
                    <div style="border-left: 3px solid #2196F3; padding-left: 10px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                            <div style="flex: 1;">
                                <div style="color: #666; font-size: 11px;">\${replyCreatedAt}</div>
                            </div>

                            <button onclick="deleteFeedback('\${reply.id}')" style="background: #f44336; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">삭제</button>
                        </div>
                        <div id="feedback-content-\${reply.id}" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px; white-space: pre-wrap;">\${reply.content}</div>

                    </div>
                \`;
            });
        }
        
        html += \`
                </div>
            </div>
        \`;
    });
    html += '</div>';
    feedbackListDiv.innerHTML = html;
}

async function addFeedback() {
    const content = document.getElementById('feedback-content').value.trim();
    
    if (!content) {
        alert('내용을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/dev-tools/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });
        
        if (response.ok) {
            document.getElementById('feedback-content').value = '';
            loadFeedbacks();
            alert('피드백이 등록되었습니다.');
        } else {
            const error = await response.json();
            alert('피드백 등록에 실패했습니다: ' + error.message);
        }
    } catch (error) {
        console.error('Add feedback failed:', error);
        alert('피드백 등록 중 오류가 발생했습니다.');
    }
}



function showReplyForm(feedbackId) {
    document.getElementById(\`reply-form-\${feedbackId}\`).style.display = 'block';
}

function hideReplyForm(feedbackId) {
    document.getElementById(\`reply-form-\${feedbackId}\`).style.display = 'none';
}

async function addReply(parentId) {
    const content = document.getElementById(\`reply-content-\${parentId}\`).value.trim();
    
    if (!content) {
        alert('내용을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/dev-tools/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                parentId: parentId
            })
        });
        
        if (response.ok) {
            document.getElementById(\`reply-content-\${parentId}\`).value = '';
            hideReplyForm(parentId);
            loadFeedbacks();
            alert('답글이 등록되었습니다.');
        } else {
            const error = await response.json();
            alert('답글 등록에 실패했습니다: ' + error.message);
        }
    } catch (error) {
        console.error('Add reply failed:', error);
        alert('답글 등록 중 오류가 발생했습니다.');
    }

}



async function deleteFeedback(feedbackId) {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(\`/dev-tools/feedback/\${feedbackId}\`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadFeedbacks();
            alert('피드백이 삭제되었습니다.');
        } else {
            const error = await response.json();
            alert('피드백 삭제에 실패했습니다: ' + error.message);
        }
    } catch (error) {
        console.error('Delete feedback failed:', error);
        alert('피드백 삭제 중 오류가 발생했습니다.');
    }
}

// 페이지 로드 시 피드백 목록 로드
document.addEventListener('DOMContentLoaded', function() {
    loadFeedbacks();
});
</script>
    </body>
    </html>
        `);
    }

    @Get('cards/api')
    getAllCards() {
        return this.devToolsService.getAllCards();
    }

    @Get('users')
    async getAllUsers() {
        return this.devToolsService.getAllUsers();
    }

    @Post('recharge-chips')
    async rechargeChips(@Body() rechargeDto: ChipRechargeDto) {
        const result = await this.devToolsService.rechargeChips(rechargeDto.goldChips, rechargeDto.userSelect);
        return result;
    }

    @Put('cards/api/:cardId')
    async updateCard(@Param('cardId') cardId: string, @Body() updateData: CardUpdateDto) {
        const success = await this.devToolsService.updateCard(cardId, updateData);
        return { success, message: success ? 'Card updated successfully' : 'Failed to update card' };
    }

    // APK 관리 제거됨

    // GameSetting 관련 엔드포인트들
    @Get('game-settings')
    async getAllGameSettings() {
        return this.devToolsService.getAllGameSettings();
    }

    @Get('game-settings/:id')
    async getGameSettingById(@Param('id') id: string) {
        const setting = await this.devToolsService.getGameSettingById(id);
        if (!setting) {
            return { success: false, message: '게임 설정을 찾을 수 없습니다.' };
        }
        return { success: true, data: setting };
    }

    @Post('game-settings')
    async createGameSetting(@Body() createDto: { id: string; name: string; value: any; description?: string }) {
        const setting = await this.devToolsService.createGameSetting(
            createDto.id,
            createDto.name,
            createDto.value,
            createDto.description
        );
        return { success: true, data: setting, message: '게임 설정이 생성되었습니다.' };
    }

    @Put('game-settings/:id')
    async updateGameSetting(
        @Param('id') id: string,
        @Body() updateDto: { name?: string; value?: any; description?: string }
    ) {
        const setting = await this.devToolsService.updateGameSetting(id, updateDto);
        return { success: true, data: setting, message: '게임 설정이 업데이트되었습니다.' };
    }

    @Delete('game-settings/:id')
    async deleteGameSetting(@Param('id') id: string) {
        await this.devToolsService.deleteGameSetting(id);
        return { success: true, message: '게임 설정이 삭제되었습니다.' };
    }

    @Get('game-settings/client/all')
    async getGameSettingsForClient() {
        return this.devToolsService.getGameSettingsForClient();
    }

    // 칩 설정 관련 API
    @Get('chip-settings')
    async getAllChipSettings() {
        return this.devToolsService.getAllChipSettings();
    }

    @Get('chip-settings/:id')
    async getChipSettingById(@Param('id') id: string) {
        const setting = await this.devToolsService.getChipSettingById(id);
        if (!setting) {
            return { success: false, message: '칩 설정을 찾을 수 없습니다.' };
        }
        return { success: true, data: setting };
    }

    @Post('chip-settings')
    async createChipSetting(@Body() createDto: { id: string; name: string; value: any; description?: string }) {
        const setting = await this.devToolsService.createChipSetting(
            createDto.id,
            createDto.name,
            createDto.value,
            createDto.description
        );
        return { success: true, data: setting, message: '칩 설정이 생성되었습니다.' };
    }

    @Put('chip-settings/:id')
    async updateChipSetting(
        @Param('id') id: string,
        @Body() updateDto: { name?: string; value?: any; description?: string }
    ) {
        const setting = await this.devToolsService.updateChipSetting(id, updateDto);
        return { success: true, data: setting, message: '칩 설정이 업데이트되었습니다.' };
    }

    @Delete('chip-settings/:id')
    async deleteChipSetting(@Param('id') id: string) {
        await this.devToolsService.deleteChipSetting(id);
        return { success: true, message: '칩 설정이 삭제되었습니다.' };
    }

    // 피드백 관련 API
    @Get('feedback')
    async getAllFeedbacks() {
        return this.feedbackService.getAllFeedbacks();
    }

    @Post('feedback')
    async createFeedback(@Body() createDto: CreateFeedbackDto) {
        return this.feedbackService.createFeedback(createDto);
    }

    @Put('feedback/:id')
    async updateFeedback(@Param('id') id: string, @Body() updateDto: UpdateFeedbackDto) {
        return this.feedbackService.updateFeedback(id, updateDto);
    }

    @Delete('feedback/:id')
    async deleteFeedback(@Param('id') id: string) {
        return this.feedbackService.deleteFeedback(id);
    }

    @Post('special-cards/joker-csv')
    @UseInterceptors(FileInterceptor('file'))
    async uploadJokerCsv(
        @UploadedFile() file: Express.Multer.File,

    ) {
        if (!file) {
            return { success: false, message: '파일이 없습니다.' };
        }
        const result = await this.devToolsService.importJokerCsv(file.buffer);
        return { success: true, data: result, message: 'Joker CSV 처리 완료' };
    }
}