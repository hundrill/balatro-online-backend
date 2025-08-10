import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('dev-tools')
export class SettingsController {
    @Get('settings')
    getSettingsPage(@Res() res: Response) {
        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Tools - 게임 설정</title>
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
            max-width: 1200px;
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
        
        .settings-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
        }
        
        .settings-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .settings-grid {
            display: grid;
            gap: 20px;
            margin-top: 20px;
        }
        
        .setting-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .setting-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        
        .setting-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .setting-info {
            flex: 1;
        }
        
        .setting-name {
            font-weight: 600;
            color: #333;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        
        .setting-description {
            color: #666;
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        .setting-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-edit {
            background: #2196F3;
            color: white;
        }
        
        .btn-edit:hover {
            background: #1976D2;
            transform: translateY(-1px);
        }
        
        .setting-value {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
            font-family: monospace;
            font-size: 14px;
            color: #333;
            word-break: break-all;
        }
        
        .setting-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #f0f0f0;
            font-size: 12px;
            color: #666;
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
        }

        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #ffeaa7;
        }

        .validation-error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 14px;
        }
            border: 1px solid #f5c6cb;
        }
        
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #c3e6cb;
        }

        .info-box {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }

        .info-box h5 {
            margin: 0 0 10px 0;
            color: #1976d2;
            font-size: 16px;
        }

        .info-box p {
            margin: 0;
            color: #1976d2;
            font-size: 14px;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/dev-tools/dashboard" class="back-btn">← 대시보드로 돌아가기</a>
            <h1>⚙️ 게임 설정</h1>
            <p>게임의 다양한 설정값들을 관리합니다</p>
        </div>
        
        <div class="content">
            <div class="settings-section">
                <h2>⚙️ 게임 설정 관리</h2>
                <div id="game-settings-list" class="settings-grid">
                    <div class="loading">설정 목록을 불러오는 중...</div>
                </div>
            </div>

            <div class="settings-section">
                <h2>💰 칩 및 상금 설정</h2>
                <div id="chip-settings-list" class="settings-grid">
                    <div class="loading">칩 설정을 불러오는 중...</div>
                </div>
            </div>
        </div>
    </div>



    <script>
        // 페이지 로드 시 설정 목록 로드
        window.onload = function() {
            loadGameSettings();
            loadChipSettings();
        };

        // 게임 설정 목록 로드
        async function loadGameSettings() {
            try {
                const response = await fetch('/dev-tools/game-settings');
                const settings = await response.json();
                renderGameSettings(settings);
            } catch (error) {
                console.error('게임 설정 목록 로드 실패:', error);
                document.getElementById('game-settings-list').innerHTML = '<div class="error">게임 설정 목록을 불러오는데 실패했습니다.</div>';
            }
        }

        // 게임 설정 렌더링
        function renderGameSettings(settings) {
            const container = document.getElementById('game-settings-list');
            
            if (settings.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">등록된 게임 설정이 없습니다.</div>';
                return;
            }
            
            let html = '<div style="display: grid; gap: 15px;">';
            settings.forEach(setting => {
                const createdDate = new Date(setting.createdAt).toLocaleString('ko-KR');
                const updatedDate = new Date(setting.updatedAt).toLocaleString('ko-KR');
                
                // chipSettings는 칩 설정 섹션에서 처리하므로 제외
                if (setting.name === 'chipSettings') {
                    return;
                }
                
                // roundRankFunds 설정인 경우 특별한 표시
                if (setting.name === 'roundRankFunds') {
                    try {
                        const roundRankData = JSON.parse(setting.value);
                        html += \`
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
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
                                        <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
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
                                    <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
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
            
            container.innerHTML = html;
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
                    alert('❌ 게임 설정 업데이트에 실패했습니다: ' + error.message);
                }
            } catch (error) {
                console.error('게임 설정 편집 실패:', error);
                alert('게임 설정 편집 중 오류가 발생했습니다.');
            }
        }

        // 칩 설정 목록 로드
        async function loadChipSettings() {
            try {
                const response = await fetch('/dev-tools/chip-settings');
                const settings = await response.json();
                renderChipSettings(settings);
            } catch (error) {
                console.error('칩 설정 목록 로드 실패:', error);
                document.getElementById('chip-settings-list').innerHTML = '<div class="error">칩 설정 목록을 불러오는데 실패했습니다.</div>';
            }
        }

        // 칩 설정 렌더링
        function renderChipSettings(settings) {
            const container = document.getElementById('chip-settings-list');
            
            if (settings.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">등록된 칩 설정이 없습니다.</div>';
                return;
            }
            
            let html = '<div style="display: grid; gap: 15px;">';
            settings.forEach(setting => {
                const createdDate = new Date(setting.createdAt).toLocaleString('ko-KR');
                const updatedDate = new Date(setting.updatedAt).toLocaleString('ko-KR');
                
                // chipSettings인 경우 새로운 구조로 표시
                if (setting.name === 'chipSettings') {
                    try {
                        const chipData = typeof setting.value === 'object' ? setting.value : JSON.parse(setting.value);
                        html += \`
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
                                    </div>
                                    <div style="display: flex; gap: 10px;">
                                        <button onclick="editChipSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                                    </div>
                                </div>
                                
                                <!-- 칩 설정 요약 -->
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
                                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">🎯 칩 타입</div>
                                        <div style="font-size: 20px; font-weight: bold; color: #333;">\${chipData.chipType === 'silver' ? '실버' : '골드'}</div>
                                    </div>
                                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
                                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">💰 시드머니</div>
                                        <div style="font-size: 20px; font-weight: bold; color: #333;">\${chipData.seedAmount || 0}</div>
                                    </div>
                                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; text-align: center;">
                                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">🎲 베팅머니</div>
                                        <div style="font-size: 20px; font-weight: bold; color: #333;">\${chipData.bettingAmount || 0}</div>
                                    </div>
                                </div>
                                
                                <!-- 라운드별 상금 섹션 -->
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">🏆 라운드별 상금 (총합: \${chipData.roundPrizes?.reduce((sum, prize) => sum + prize, 0) || 15})</h5>
                                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                        \`;
                        
                        for (let round = 1; round <= 5; round++) {
                            const prize = chipData.roundPrizes?.[round - 1] || round;
                            html += \`
                                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; text-align: center;">
                                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">\${round}라운드</div>
                                    <div style="font-size: 18px; font-weight: bold; color: #333;">\${prize}</div>
                                </div>
                            \`;
                        }
                        
                        html += \`
                                    </div>
                                </div>
                                
                                <div style="text-align: right; font-size: 12px; color: #666;">수정일: \${updatedDate}</div>
                            </div>
                        \`;
                    } catch (e) {
                        // JSON 파싱 실패 시 일반 표시
                        html += \`
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
                                    </div>
                                    <div style="display: flex; gap: 10px;">
                                        <button onclick="editChipSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                                    </div>
                                </div>
                                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; font-family: monospace; font-size: 14px; color: #333; word-break: break-all; margin-bottom: 10px;">
                                    \${typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : setting.value}
                                </div>
                                <div style="text-align: right; font-size: 12px; color: #666;">수정일: \${updatedDate}</div>
                            </div>
                        \`;
                    }
                } else {
                    // 다른 설정들은 기존 방식으로 표시
                    html += \`
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; color: #555; margin-bottom: 10px; font-weight: bold;">\${setting.description || '설명 없음'}</div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button onclick="editChipSetting('\${setting.id}')" style="background: #2196F3; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">편집</button>
                                </div>
                            </div>
                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; font-family: monospace; font-size: 14px; color: #333; word-break: break-all; margin-bottom: 10px;">
                                \${typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : setting.value}
                            </div>
                            <div style="text-align: right; font-size: 12px; color: #666;">수정일: \${updatedDate}</div>
                        </div>
                    \`;
                }
            });
            
            html += '</div>';
            container.innerHTML = html;
        }

        // 칩 설정 편집 함수
        async function editChipSetting(settingId) {
            try {
                const response = await fetch(\`/dev-tools/chip-settings/\${settingId}\`);
                const setting = await response.json();
                
                if (!setting.success) {
                    alert('칩 설정을 찾을 수 없습니다.');
                    return;
                }

                // 칩 타입, 시드머니, 베팅머니, 라운드별 상금 편집 UI
                let html = '<div style="padding: 20px; background: white; border-radius: 10px; max-width: 800px; margin: 20px auto;">';
                html += '<h3 style="margin-bottom: 20px; color: #333;">🎯 칩 타입 및 상금 설정</h3>';
                html += '<p style="margin-bottom: 25px; color: #666; font-size: 14px;">방에서 사용할 칩 타입과 시드머니, 베팅머니, 라운드별 상금을 설정합니다.</p>';
                
                // 현재 설정값 파싱
                let currentSettings = {};
                try {
                    currentSettings = JSON.parse(setting.data.value);
                } catch (e) {
                    currentSettings = {
                        chipType: 'silver',
                        seedAmount: 15,
                        bettingAmount: 1,
                        roundPrizes: [1, 2, 3, 4, 5]
                    };
                }

                // 칩 타입 설정
                html += '<div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">';
                html += '<h4 style="margin-bottom: 15px; color: #333;">🎯 칩 타입 선택</h4>';
                html += '<div style="display: grid; grid-template-columns: 1fr; gap: 15px;">';
                html += \`
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">사용할 칩 타입:</label>
                        <select id="chipType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                            <option value="silver" \${currentSettings.chipType === 'silver' ? 'selected' : ''}>실버</option>
                            <option value="gold" \${currentSettings.chipType === 'gold' ? 'selected' : ''}>골드</option>
                        </select>
                    </div>
                \`;
                html += '</div></div>';

                // 시드머니 설정
                html += '<div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">';
                html += '<h4 style="margin-bottom: 15px; color: #333;">💰 시드머니 금액</h4>';
                html += '<div style="display: grid; grid-template-columns: 1fr; gap: 15px;">';
                html += \`
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">시드머니 금액:</label>
                        <input type="number" id="seedAmount" value="\${currentSettings.seedAmount || 15}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    </div>
                \`;
                html += '</div></div>';

                // 베팅머니 설정
                html += '<div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">';
                html += '<h4 style="margin-bottom: 15px; color: #333;">🎲 베팅머니 금액</h4>';
                html += '<div style="display: grid; grid-template-columns: 1fr; gap: 15px;">';
                html += \`
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">베팅머니 금액:</label>
                        <input type="number" id="bettingAmount" value="\${currentSettings.bettingAmount || 1}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    </div>
                \`;
                html += '</div></div>';

                // 라운드별 상금 설정
                html += '<div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">';
                html += '<h4 style="margin-bottom: 15px; color: #333;">🏆 라운드별 상금</h4>';
                html += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">';
                
                for (let round = 1; round <= 5; round++) {
                    const currentPrize = currentSettings.roundPrizes?.[round - 1] || round;
                    html += \`
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">\${round}라운드 상금:</label>
                            <input type="number" id="round\${round}Prize" value="\${currentPrize}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                    \`;
                }
                html += '</div></div>';

                // 검증 안내 메시지
                html += '<div class="info-box">';
                html += '<h5>⚠️ 검증 규칙</h5>';
                html += '<p>시드머니 금액과 라운드별 상금의 총합이 정확히 일치해야 합니다.</p>';
                html += '<p style="margin-top: 8px; font-size: 13px;">예: 시드머니 15 = 1라운드(1) + 2라운드(2) + 3라운드(3) + 4라운드(4) + 5라운드(5)</p>';
                html += '</div>';

                // 검증 결과 표시 영역
                html += '<div id="validationResult" style="margin-bottom: 20px;"></div>';

                // 버튼
                html += '<div style="text-align: right;">';
                html += '<button onclick="closeChipSettings()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">취소</button>';
                html += '<button onclick="saveChipSettings()" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">저장</button>';
                html += '</div>';
                html += '</div>';
                
                // 모달 생성 및 표시
                const modal = document.createElement('div');
                modal.id = 'chipSettingsModal';
                modal.style.cssText = 'position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); overflow-y: auto;';
                modal.innerHTML = html;
                document.body.appendChild(modal);
                
                // 전역 함수 등록
                window.saveChipSettings = async function() {
                    try {
                        // 입력값 수집
                        const newSettings = {
                            chipType: document.getElementById('chipType').value,
                            seedAmount: parseInt(document.getElementById('seedAmount').value) || 0,
                            bettingAmount: parseInt(document.getElementById('bettingAmount').value) || 0,
                            roundPrizes: []
                        };

                        // 라운드별 상금 수집
                        for (let round = 1; round <= 5; round++) {
                            const prize = parseInt(document.getElementById(\`round\${round}Prize\`).value) || 0;
                            newSettings.roundPrizes.push(prize);
                        }

                        // 검증
                        const validationResult = validateChipSettings(newSettings);
                        if (!validationResult.isValid) {
                            document.getElementById('validationResult').innerHTML = \`
                                <div class="validation-error">
                                    <strong>❌ 검증 실패:</strong><br>
                                    \${validationResult.message.replace(/\\n/g, '<br>')}
                                </div>
                            \`;
                            return;
                        }

                        // 검증 성공 메시지
                        document.getElementById('validationResult').innerHTML = \`
                            <div class="success">
                                <strong>✅ 검증 성공:</strong> 설정이 올바릅니다.
                            </div>
                        \`;

                        // API 호출
                        const updateResponse = await fetch(\`/dev-tools/chip-settings/\${settingId}\`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                value: JSON.stringify(newSettings),
                                description: setting.data.description
                            })
                        });
                        
                        if (updateResponse.ok) {
                            const result = await updateResponse.json();
                            alert('✅ ' + result.message);
                            closeChipSettings();
                            loadChipSettings();
                        } else {
                            const error = await updateResponse.json();
                            alert('❌ 설정 업데이트에 실패했습니다: ' + error.message);
                        }
                    } catch (error) {
                        console.error('칩 설정 저장 실패:', error);
                        alert('설정 저장 중 오류가 발생했습니다.');
                    }
                };
                
                window.closeChipSettings = function() {
                    const modal = document.getElementById('chipSettingsModal');
                    if (modal) {
                        document.body.removeChild(modal);
                    }
                    // 전역 함수 제거
                    delete window.saveChipSettings;
                    delete window.closeChipSettings;
                };
                
            } catch (error) {
                console.error('칩 설정 편집 UI 생성 실패:', error);
                alert('편집 UI를 생성하는데 실패했습니다.');
            }
        }

        // 칩 설정 검증 함수
        function validateChipSettings(settings) {
            const seedAmount = settings.seedAmount;
            const totalPrizes = settings.roundPrizes.reduce((sum, prize) => sum + prize, 0);
            
            if (seedAmount !== totalPrizes) {
                return {
                    isValid: false,
                    message: \`시드머니(\${seedAmount})과 라운드별 상금 총합(\${totalPrizes})이 일치하지 않습니다.\\n\\n시드머니: \${seedAmount}\\n라운드별 상금: \${settings.roundPrizes.join(' + ')} = \${totalPrizes}\`
                };
            }
            
            return { isValid: true };
        }

        // roundRankFunds 설정 편집 함수
        async function editRoundRankFunds(setting) {
            try {
                const roundRankData = JSON.parse(setting.value);
                let newRoundRankData = { ...roundRankData };
                
                // 5라운드 x 4등급 편집 UI
                let html = '<div style="padding: 20px; background: white; border-radius: 10px; max-width: 800px; margin: 20px auto;">';
                html += '<h3 style="margin-bottom: 20px; color: #333;">라운드별 등급별 보상 설정</h3>';
                html += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">';
                
                for (let round = 1; round <= 5; round++) {
                    html += \`<div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f8f9fa;">\`;
                    html += \`<h4 style="margin-bottom: 15px; text-align: center; color: #333;">\${round}라운드</h4>\`;
                    
                    for (let rank = 1; rank <= 4; rank++) {
                        const currentValue = roundRankData[round]?.[rank] || 0;
                        html += \`
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">\${rank}등:</label>
                                <input type="number" id="round\${round}rank\${rank}" value="\${currentValue}" 
                                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                            </div>
                        \`;
                    }
                    html += '</div>';
                }
                
                html += '</div>';
                html += '<div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">';
                html += '<button onclick="closeRoundRankFunds()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">취소</button>';
                html += '<button onclick="saveRoundRankFunds()" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">저장</button>';
                html += '</div>';
                html += '</div>';
                
                // 모달 생성 및 표시
                const modal = document.createElement('div');
                modal.id = 'roundRankFundsModal';
                modal.style.cssText = 'position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); overflow-y: auto;';
                modal.innerHTML = html;
                document.body.appendChild(modal);
                
                // 전역 함수 등록
                window.saveRoundRankFunds = async function() {
                    try {
                        // 입력값 수집
                        for (let round = 1; round <= 5; round++) {
                            if (!newRoundRankData[round]) newRoundRankData[round] = {};
                            for (let rank = 1; rank <= 4; rank++) {
                                const value = parseInt(document.getElementById(\`round\${round}rank\${rank}\`).value) || 0;
                                newRoundRankData[round][rank] = value;
                            }
                        }
                        
                        // API 호출
                        const updateResponse = await fetch(\`/dev-tools/game-settings/\${setting.id}\`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                value: JSON.stringify(newRoundRankData),
                                description: setting.description
                            })
                        });
                        
                        if (updateResponse.ok) {
                            const result = await updateResponse.json();
                            alert('✅ ' + result.message);
                            closeRoundRankFunds();
                            loadGameSettings();
                        } else {
                            const error = await updateResponse.json();
                            alert('❌ 설정 업데이트에 실패했습니다: ' + error.message);
                        }
                    } catch (error) {
                        console.error('roundRankFunds 저장 실패:', error);
                        alert('설정 저장 중 오류가 발생했습니다.');
                    }
                };
                
                window.closeRoundRankFunds = function() {
                    const modal = document.getElementById('roundRankFundsModal');
                    if (modal) {
                        document.body.removeChild(modal);
                    }
                    // 전역 함수 제거
                    delete window.saveRoundRankFunds;
                    delete window.closeRoundRankFunds;
                };
                
            } catch (error) {
                console.error('roundRankFunds 편집 UI 생성 실패:', error);
                alert('편집 UI를 생성하는데 실패했습니다.');
            }
        }


    </script>
</body>
</html>
        `);
    }
} 