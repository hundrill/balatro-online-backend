import { Controller, Get, Put, Post, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { DevToolsService } from './dev-tools.service';
import { CardUpdateDto, ChipRechargeDto } from './dto/card-update.dto';

@Controller('dev-tools')
export class DevToolsController {
    constructor(private readonly devToolsService: DevToolsService) { }

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
    
    <!-- Chip Recharge Section -->
    <div class="card-section">
        <h2>💰 테스트 칩 충전</h2>
        <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px; align-items: center;">
                <label style="font-weight: 600; color: #333;">실버칩:</label>
                <input type="number" id="silver-chip-amount" value="1000" min="0" style="width: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
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
                        <div class="form-group">
                            <label>적용 카드수:</label>
                            <input type="number" id="edit-need-card-count">
                        </div>
                        <div class="form-group">
                            <label>칩 강화:</label>
                            <input type="number" id="edit-enhance-chips">
                        </div>
                        <div class="form-group">
                            <label>배율 강화:</label>
                            <input type="number" id="edit-enhance-mul" step="0.1">
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
                            <span class="stat-label">적용 카드수:</span>
                            <span class="stat-value">\${card.needCardCount || 0}</span>
                        </div>\` : ''}
                        \${isPlanet ? \`<div class="stat-item">
                            <span class="stat-label">칩 강화:</span>
                            <span class="stat-value">\${card.enhanceChips || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">배율 강화:</span>
                            <span class="stat-value">\${card.enhanceMul || 0}</span>
                        </div>\` : ''}
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
            document.getElementById('edit-need-card-count').value = card.needCardCount || '';
            document.getElementById('edit-enhance-chips').value = card.enhanceChips || '';
            document.getElementById('edit-enhance-mul').value = card.enhanceMul || '';
            document.getElementById('edit-is-active').checked = card.isActive !== false;
            
            // 카드 타입에 따라 필드 표시/숨김
            const isJoker = card.id.startsWith('joker_');
            const isPlanet = card.id.startsWith('planet_');
            const isTarot = card.id.startsWith('tarot_');
            
            // 조커 카드에서는 필요 카드 수, 칩 강화, 배율 강화 필드 숨김
            document.getElementById('edit-need-card-count').parentElement.style.display = isJoker ? 'none' : 'block';
            document.getElementById('edit-enhance-chips').parentElement.style.display = isPlanet ? 'block' : 'none';
            document.getElementById('edit-enhance-mul').parentElement.style.display = isPlanet ? 'block' : 'none';
            
            // 행성 카드에서는 기본값, 증가값, 감소값, 최대값, 필요 카드 수 필드 숨김
            document.getElementById('edit-basevalue').parentElement.style.display = isPlanet ? 'none' : 'block';
            document.getElementById('edit-increase').parentElement.style.display = isPlanet ? 'none' : 'block';
            document.getElementById('edit-decrease').parentElement.style.display = isPlanet ? 'none' : 'block';
            document.getElementById('edit-maxvalue').parentElement.style.display = isPlanet ? 'none' : 'block';
            
            // 타로 카드에서는 기본값, 증가값, 감소값, 최대값, 칩 강화, 배율 강화 필드 숨김 (적용 카드수만 표시)
            if (isTarot) {
                document.getElementById('edit-basevalue').parentElement.style.display = 'none';
                document.getElementById('edit-increase').parentElement.style.display = 'none';
                document.getElementById('edit-decrease').parentElement.style.display = 'none';
                document.getElementById('edit-maxvalue').parentElement.style.display = 'none';
                document.getElementById('edit-enhance-chips').parentElement.style.display = 'none';
                document.getElementById('edit-enhance-mul').parentElement.style.display = 'none';
                document.getElementById('edit-need-card-count').parentElement.style.display = 'block';
            }
            
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
            
            // 타로 카드인 경우 적용 카드수만 추가
            if (isTarot) {
                updateData.needCardCount = parseInt(document.getElementById('edit-need-card-count').value) || 0;
            }
            
            // 행성 카드인 경우에만 칩 강화, 배율 강화 추가
            if (isPlanet) {
                updateData.enhanceChips = parseInt(document.getElementById('edit-enhance-chips').value) || 0;
                updateData.enhanceMul = parseFloat(document.getElementById('edit-enhance-mul').value) || 0;
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
            const silverChips = parseInt(document.getElementById('silver-chip-amount').value) || 0;
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
                        silverChips: silverChips,
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

// 유저 목록 로드 함수
async function loadUsers() {
    try {
        const response = await fetch('/dev-tools/users');
        const users = await response.json();

        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = '<option value="all">모든 유저</option>';

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.email;
            option.textContent = \`\${user.email} (\${user.nickname || '닉네임 없음'})\`;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}
</script>
    </body>
    </html>
        `);
    }

    @Get('cards')
    getAllCards() {
        return this.devToolsService.getAllCards();
    }

    @Get('users')
    async getAllUsers() {
        return this.devToolsService.getAllUsers();
    }

    @Post('recharge-chips')
    async rechargeChips(@Body() rechargeDto: ChipRechargeDto) {
        const result = await this.devToolsService.rechargeChips(rechargeDto.silverChips, rechargeDto.userSelect);
        return result;
    }

    @Put('cards/:cardId')
    async updateCard(@Param('cardId') cardId: string, @Body() updateData: CardUpdateDto) {
        const success = await this.devToolsService.updateCard(cardId, updateData);
        return { success, message: success ? 'Card updated successfully' : 'Failed to update card' };
    }
} 