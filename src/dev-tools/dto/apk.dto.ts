import { IsString, IsOptional, IsDate } from 'class-validator';

export class ApkUploadDto {
    @IsString()
    comment: string;
}

export class ApkInfoDto {
    id: string;
    filename: string;
    originalName: string;
    uploadDate: Date;
    comment: string;
    size: number;
    downloadUrl: string;
} 