import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApkInfoDto } from './dto/apk.dto';

@Injectable()
export class ApkService {
    private readonly logger = new Logger(ApkService.name);
    private readonly uploadDir = join(process.cwd(), 'uploads', 'apk');
    private readonly apkInfoFile = join(this.uploadDir, 'apk-info.json');
    private apkList: ApkInfoDto[] = [];

    constructor() {
        this.initializeUploadDir();
        this.loadApkInfo();
    }

    private async initializeUploadDir() {
        try {
            if (!existsSync(this.uploadDir)) {
                await mkdir(this.uploadDir, { recursive: true });
                this.logger.log(`APK 업로드 디렉토리 생성: ${this.uploadDir}`);
            }
        } catch (error) {
            this.logger.error(`APK 업로드 디렉토리 생성 실패: ${error.message}`);
        }
    }

    private async loadApkInfo() {
        try {
            if (existsSync(this.apkInfoFile)) {
                const data = await readFile(this.apkInfoFile, 'utf-8');
                this.apkList = JSON.parse(data);
                this.logger.log(`APK 정보 로드 완료: ${this.apkList.length}개`);
            }
        } catch (error) {
            this.logger.error(`APK 정보 로드 실패: ${error.message}`);
            this.apkList = [];
        }
    }

    private async saveApkInfo() {
        try {
            await writeFile(this.apkInfoFile, JSON.stringify(this.apkList, null, 2));
        } catch (error) {
            this.logger.error(`APK 정보 저장 실패: ${error.message}`);
        }
    }

    async uploadApk(file: Express.Multer.File, comment: string): Promise<ApkInfoDto> {
        if (!file) {
            throw new BadRequestException('APK 파일이 필요합니다.');
        }

        if (!file.originalname.endsWith('.apk')) {
            throw new BadRequestException('APK 파일만 업로드 가능합니다.');
        }

        const apkId = uuidv4();
        const filename = `${apkId}.apk`;
        const filepath = join(this.uploadDir, filename);

        try {
            await writeFile(filepath, file.buffer);

            const apkInfo: ApkInfoDto = {
                id: apkId,
                filename: filename,
                originalName: file.originalname,
                uploadDate: new Date(),
                comment: comment,
                size: file.size,
                downloadUrl: `/dev-tools/apk/download/${apkId}`
            };

            this.apkList.unshift(apkInfo); // 최신 파일을 맨 위에 추가
            await this.saveApkInfo();

            this.logger.log(`APK 업로드 완료: ${file.originalname} (${apkId})`);
            return apkInfo;
        } catch (error) {
            this.logger.error(`APK 업로드 실패: ${error.message}`);
            throw new BadRequestException('APK 업로드에 실패했습니다.');
        }
    }

    async downloadApk(apkId: string): Promise<{ buffer: Buffer; filename: string; originalName: string }> {
        const apkInfo = this.apkList.find(apk => apk.id === apkId);
        if (!apkInfo) {
            throw new NotFoundException('APK 파일을 찾을 수 없습니다.');
        }

        const filepath = join(this.uploadDir, apkInfo.filename);

        try {
            const buffer = await readFile(filepath);
            return {
                buffer,
                filename: apkInfo.filename,
                originalName: apkInfo.originalName
            };
        } catch (error) {
            this.logger.error(`APK 다운로드 실패: ${error.message}`);
            throw new NotFoundException('APK 파일을 읽을 수 없습니다.');
        }
    }

    async deleteApk(apkId: string): Promise<void> {
        const apkIndex = this.apkList.findIndex(apk => apk.id === apkId);
        if (apkIndex === -1) {
            throw new NotFoundException('APK 파일을 찾을 수 없습니다.');
        }

        const apkInfo = this.apkList[apkIndex];
        const filepath = join(this.uploadDir, apkInfo.filename);

        try {
            await unlink(filepath);
            this.apkList.splice(apkIndex, 1);
            await this.saveApkInfo();

            this.logger.log(`APK 삭제 완료: ${apkInfo.originalName} (${apkId})`);
        } catch (error) {
            this.logger.error(`APK 삭제 실패: ${error.message}`);
            throw new BadRequestException('APK 삭제에 실패했습니다.');
        }
    }

    getAllApks(): ApkInfoDto[] {
        return this.apkList;
    }

    getLatestApk(): ApkInfoDto | null {
        return this.apkList.length > 0 ? this.apkList[0] : null;
    }
} 