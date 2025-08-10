import { Controller, Get, Post, Res, UseInterceptors, UploadedFile, Body, Param } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('dev-tools')
export class DashboardController {
    @Get('dashboard')
    getDashboard(@Res() res: Response) {
        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Tools - Dashboard</title>
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
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .dashboard-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            text-align: center;
        }
        .dashboard-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .dashboard-card h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .dashboard-card p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .dashboard-btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .dashboard-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        /* 반응형 디자인 */
        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            .section { padding: 15px; margin-bottom: 15px; }
            .header h1 { font-size: 2em; }
            body { padding: 15px; }
        }
        
        @media (max-width: 480px) {
            .section { padding: 12px; }
            .header h1 { font-size: 1.8em; }
            body { padding: 10px; }
        }
        .chip-recharge-form {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }
        .chip-recharge-form input, .chip-recharge-form select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .recharge-btn {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .recharge-btn:hover {
            background: linear-gradient(45deg, #45a049, #4CAF50);
        }
        .apk-upload-form {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 15px;
            align-items: end;
            margin-bottom: 20px;
        }
        .apk-upload-form input, .apk-upload-form select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .upload-btn {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .upload-btn:hover {
            background: linear-gradient(45deg, #1976D2, #2196F3);
        }
        .apk-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        .apk-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
        }
        .apk-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .apk-name {
            font-weight: bold;
            color: #333;
        }
        .apk-version {
            background: #2196F3;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        .apk-actions {
            display: flex;
            gap: 5px;
        }
        .download-btn, .delete-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8em;
        }
        .download-btn {
            background: #4CAF50;
            color: white;
        }
        .delete-btn {
            background: #f44336;
            color: white;
        }
        .feedback-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 15px;
        }
        .feedback-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
        }
        .feedback-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .feedback-title {
            font-weight: bold;
            color: #333;
        }
        .feedback-status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        .feedback-status.pending {
            background: #FFF3E0;
            color: #E65100;
        }
        .feedback-status.in-progress {
            background: #E3F2FD;
            color: #1565C0;
        }
        .feedback-status.completed {
            background: #E8F5E8;
            color: #2E7D32;
        }
        .feedback-content {
            color: #555;
            font-size: 0.9em;
            line-height: 1.4;
        }
        .feedback-actions {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        .edit-feedback-btn, .delete-feedback-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8em;
        }
        .edit-feedback-btn {
            background: #2196F3;
            color: white;
        }
        .delete-feedback-btn {
            background: #f44336;
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 Dev Tools Dashboard</h1>
    </div>

    <!-- 대시보드 카드들 -->
    <div class="dashboard-grid">
        <div class="dashboard-card">
            <h3>🃏 카드 관리</h3>
            <p>조커, 행성, 타로 카드들의 속성과 효과를 관리합니다.</p>
            <a href="/dev-tools/cards" class="dashboard-btn">카드 관리</a>
        </div>
        <div class="dashboard-card">
            <h3>⚙️ 게임 설정</h3>
            <p>게임의 다양한 설정값들을 관리합니다.</p>
            <a href="/dev-tools/settings" class="dashboard-btn">설정 관리</a>
        </div>
    </div>

    <!-- APK 업로드와 칩 충전 섹션 -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;" class="dashboard-grid">
        <!-- APK 업로드 섹션 -->
        <div class="section" style="margin: 0;">
            <h2 style="margin-top: 0; color: #1976D2; font-size: 1.5em; margin-bottom: 20px;">📱 APK 업로드</h2>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="color:#333; margin: 0 0 10px 0; font-size: 1.1em;">업로드된 APK</h3>
                <div id="apk-files" style="font-size: 14px; color:#444; min-height: 20px;"></div>
            </div>
            <form id="apk-upload-form" enctype="multipart/form-data" style="margin-bottom: 15px;">
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-weight: 600; color: #333; font-size: 0.9em;">APK 파일</label>
                        <input type="file" id="apk-file" name="file" accept=".apk" required style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; background: white; transition: border-color 0.3s;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-weight: 600; color: #333; font-size: 0.9em;">코멘트</label>
                        <input type="text" id="apk-comment" name="comment" placeholder="업로드 코멘트를 입력하세요" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; background: white; transition: border-color 0.3s;">
                    </div>
                    <button type="submit" style="background: linear-gradient(45deg, #2196F3, #1976D2); color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95em; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3); width: fit-content;">APK 업로드</button>
                </div>
            </form>
            <div id="apk-upload-result"></div>
        </div>

        <!-- 칩 충전 섹션 -->
        <div class="section" style="margin: 0;">
            <h2 style="margin-top: 0; color: #4CAF50; font-size: 1.5em; margin-bottom: 20px;">💰 테스트 칩 충전/차감</h2>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="color:#333; margin: 0 0 10px 0; font-size: 1.1em;">충전 설정</h3>
                                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-weight: 600; color: #333; font-size: 0.9em;">유저 선택</label>
                            <select id="user-select" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; background: white; transition: border-color 0.3s;">
                                <option value="all">모든 유저 일괄 초기화</option>
                            </select>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-weight: 600; color: #333; font-size: 0.9em;">실버칩</label>
                            <input type="number" id="silver-chip-amount" value="10000" min="-999999" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; background: white; transition: border-color 0.3s;">
                            <small style="color: #666; font-size: 0.8em;">음수 입력 시 칩을 차감합니다. "모든 유저 일괄 초기화" 선택 시 입력값으로 설정됩니다.</small>
                        </div>
                    </div>
            </div>
            <button onclick="rechargeChips()" style="background: linear-gradient(45deg, #4CAF50, #45a049); color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95em; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);">칩 충전/차감</button>
            <div id="recharge-result" style="margin-top: 15px;"></div>
        </div>
    </div>

    <script>
        // 페이지 로드 시 데이터 가져오기
        window.onload = function() {
            loadUsers();
            loadApkFiles();
        };

        // 유저 목록 로드
        async function loadUsers() {
            try {
                const response = await fetch('/dev-tools/users');
                const users = await response.json();
                const userSelect = document.getElementById('user-select');
                userSelect.innerHTML = '<option value="all">모든 유저 일괄 초기화</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.email;
                    option.textContent = \`\${user.email} (\${user.nickname || '닉네임 없음'}) - 칩: \${user.silverChip}\`;
                    userSelect.appendChild(option);
                });
            } catch (error) {
                console.error('유저 목록 로드 실패:', error);
            }
        }

        // 칩 충전/차감
        async function rechargeChips() {
            const silverChips = parseInt(document.getElementById('silver-chip-amount').value) || 0;
            const userSelect = document.getElementById('user-select').value;
            
            if (silverChips === 0) {
                document.getElementById('recharge-result').innerHTML = '<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7;">칩 수량을 입력해주세요.</div>';
                return;
            }
            
            try {
                const response = await fetch('/dev-tools/recharge-chips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ silverChips: silverChips, userSelect: userSelect })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success) {
                        let message = \`<div style="background: #e8f5e8; color: #2e7d32; padding: 10px; border-radius: 4px; border: 1px solid #4caf50;">✅ \${result.message}</div>\`;
                        
                        // 칩 변동량 표시
                        if (result.chipChanges && result.chipChanges.length > 0) {
                            message += '<div style="background: #f3e5f5; color: #4a148c; padding: 10px; border-radius: 4px; border: 1px solid #ba68c8; margin-top: 10px;">';
                            message += '<strong>칩 변동 내역:</strong><br>';
                            result.chipChanges.forEach(change => {
                                message += \`• \${change.email}: \${change.before} → \${change.after}\` + '<br>';
                            });
                            message += '</div>';
                        }
                        
                        if (result.onlineUsers && result.onlineUsers.length > 0) {
                            message += \`<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin-top: 10px;">
                                <strong>게임 접속 중인 유저:</strong> \${result.onlineUsers.join(', ')}
                            </div>\`;
                        }
                        
                        document.getElementById('recharge-result').innerHTML = message;
                        // 유저 목록 새로고침
                        loadUsers();
                    } else {
                        let message = \`<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">❌ \${result.message}</div>\`;
                        
                        if (result.onlineUsers && result.onlineUsers.length > 0) {
                            message += \`<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7; margin-top: 10px;">
                                <strong>게임 접속 중인 유저:</strong> \${result.onlineUsers.join(', ')}
                            </div>\`;
                        }
                        
                        document.getElementById('recharge-result').innerHTML = message;
                    }
                } else {
                    document.getElementById('recharge-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">칩 변동에 실패했습니다.</div>';
                }
            } catch (error) {
                console.error('칩 변동 실패:', error);
                document.getElementById('recharge-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">칩 변동 중 오류가 발생했습니다.</div>';
            }
        }

        // 업로드된 APK 파일 목록 표시 (uploads/apk 디렉토리 스캔)
        async function loadApkFiles() {
            try {
                const response = await fetch('/dev-tools/apk/list-files');
                if (!response.ok) return;
                const files = await response.json();
                var html = '';
                if (files.length === 0) {
                    html = '<div style="color:#777;">표시할 파일이 없습니다.</div>';
                } else {
                    html = '<ul style="margin:0; padding-left:18px;">' + files.map(function(file){
                        var commentText = file.comment ? ' (' + file.comment + ')' : '';
                        var dateText = new Date(file.uploadTime).toLocaleString('ko-KR');
                        return '<li><a href="/dev-tools/apk/download/' + encodeURIComponent(file.name) + '">' + file.name + '</a><br><small style="color:#666;">업로드: ' + dateText + '</small>' + (commentText ? '<br><small style="color:#666;">코멘트: ' + file.comment + '</small>' : '') + '</li>';
                    }).join('') + '</ul>';
                }
                var el = document.getElementById('apk-files');
                if (el) el.innerHTML = html;
            } catch(e) { /* noop */ }
        }

        // APK 업로드 처리 (아래 간단 처리 핸들러 하나만 유지)

        // APK 업로드 폼 이벤트 리스너 (중복 제거 및 간단 처리)
        document.getElementById('apk-upload-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData();
            const fileInput = document.getElementById('apk-file');
            const commentInput = document.getElementById('apk-comment');
            if (!fileInput || fileInput.files.length === 0) {
                document.getElementById('apk-upload-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">APK 파일을 선택해주세요.</div>';
                return;
            }
            formData.append('file', fileInput.files[0]);
            formData.append('comment', (commentInput && commentInput.value) ? commentInput.value : '');
            try {
                const response = await fetch('/dev-tools/apk/upload', { method: 'POST', body: formData });
                if (response.ok) {
                    const result = await response.json();
                    var link = '/dev-tools/apk/download/' + encodeURIComponent(result.originalName);
                    document.getElementById('apk-upload-result').innerHTML = '<div style="background: #e8f5e8; color: #2e7d32; padding: 10px; border-radius: 4px; border: 1px solid #4caf50;">✅ APK 업로드 성공: ' + result.originalName + ' · <a href="' + link + '" style="text-decoration: underline; color: #1976D2;">다운로드</a></div>';
                    loadApkFiles(); // 목록 새로고침
                    fileInput.value = '';
                    if (commentInput) commentInput.value = '';
                } else {
                    const error = await response.json().catch(function(){return {message:"알 수 없는 오류"}});
                    document.getElementById('apk-upload-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">❌ APK 업로드 실패: ' + error.message + '</div>';
                }
            } catch (err) {
                document.getElementById('apk-upload-result').innerHTML = '<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; border: 1px solid #ef5350;">APK 업로드 중 오류가 발생했습니다.</div>';
            }
        });

        // APK 목록/다운로드/삭제 기능 제거

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

        // 피드백 관련 함수들 제거됨
    </script>
</body>
</html>
        `);
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
            // 코멘트를 별도 파일로 저장
            const commentPath = path.join(uploadDir, file.originalname + '.comment');
            fs.writeFileSync(commentPath, comment || '');
            return { success: true, originalName: file.originalname, size: file.size, comment: comment || '', uploadTime: new Date().toISOString() };
        } catch (e) {
            return { success: false, message: '파일 저장 실패' };
        }
    }

    @Get('apk/download/:fileName')
    async downloadApk(@Param('fileName') fileName: string, @Res() res: Response) {
        const filePath = path.join(process.cwd(), 'uploads', 'apk', fileName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('파일을 찾을 수 없습니다.');
        }
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => {
            if (!res.headersSent) {
                res.status(500).send('파일 전송 중 오류가 발생했습니다.');
            }
        });
    }

    @Get('apk/list-files')
    async listApkFiles() {
        const dir = path.join(process.cwd(), 'uploads', 'apk');
        try {
            if (!fs.existsSync(dir)) return [];
            const files = fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.apk'));
            const fileInfos = files.map(name => {
                const commentPath = path.join(dir, name + '.comment');
                let comment = '';
                try {
                    if (fs.existsSync(commentPath)) {
                        comment = fs.readFileSync(commentPath, 'utf8');
                    }
                } catch { }
                const stats = fs.statSync(path.join(dir, name));
                return { name, comment, uploadTime: stats.mtime.toISOString() };
            });
            // 최근 1개만 반환 (업로드 시간 기준 내림차순)
            return fileInfos.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime()).slice(0, 1);
        } catch {
            return [];
        }
    }
} 