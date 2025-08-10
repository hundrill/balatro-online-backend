import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TranslationKeys } from '../translation-keys.enum';

interface Translation {
    key: string;
    value: string;
}

interface LocalizationData {
    translations: Translation[];
}

@Injectable()
export class LocalizationService {
    private translations: Map<string, Map<string, string>> = new Map();
    private readonly localizationDir = path.join(__dirname, '../localization');

    constructor() {
        this.loadAllTranslations();
    }

    private loadAllTranslations(): void {
        try {
            const languages = ['en', 'ko', 'id'];

            for (const language of languages) {
                const filePath = path.join(this.localizationDir, `${language}.json`);
                if (fs.existsSync(filePath)) {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const localizationData: LocalizationData = JSON.parse(data);

                    const languageTranslations = new Map<string, string>();
                    for (const translation of localizationData.translations) {
                        languageTranslations.set(translation.key, translation.value);
                    }

                    this.translations.set(language, languageTranslations);
                }
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    /**
 * 번역 키에 해당하는 텍스트를 반환합니다.
 * @param key 번역 키
 * @param language 언어 코드
 * @param args 포맷팅 인자들
 * @returns 번역된 텍스트
 */
    getText(key: TranslationKeys, language: string = 'en', ...args: any[]): string {
        const languageTranslations = this.translations.get(language);
        const text = languageTranslations?.get(key) || key;

        if (args.length === 0) {
            return text;
        }

        // {0}, {1}, {2} 등의 플레이스홀더를 인자로 치환
        return text.replace(/\{(\d+)\}/g, (match, index) => {
            const argIndex = parseInt(index);
            return args[argIndex] !== undefined ? String(args[argIndex]) : match;
        });
    }

    /**
 * 번역 키가 존재하는지 확인합니다.
 * @param key 번역 키
 * @param language 언어 코드
 * @returns 존재 여부
 */
    hasKey(key: TranslationKeys, language: string = 'en'): boolean {
        const languageTranslations = this.translations.get(language);
        return languageTranslations?.has(key) || false;
    }

    /**
 * 모든 번역 키를 반환합니다.
 * @param language 언어 코드
 * @returns 번역 키 배열
 */
    getAllKeys(language: string = 'en'): string[] {
        const languageTranslations = this.translations.get(language);
        return languageTranslations ? Array.from(languageTranslations.keys()) : [];
    }

    /**
 * 번역 데이터를 다시 로드합니다.
 */
    reload(): void {
        this.loadAllTranslations();
    }
} 