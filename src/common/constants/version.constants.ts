export const SERVER_VERSION = 101; // 1.0.0을 100으로 표현

// 지원하는 최소 클라이언트 버전
export const MIN_CLIENT_VERSION = 101; // 1.0.0을 100으로 표현

// 버전 비교 함수 (int 형)
export function compareVersions(version1: number, version2: number): number {
    if (version1 > version2) return 1;
    if (version1 < version2) return -1;
    return 0;
}

// 클라이언트 버전이 지원되는지 확인
export function isClientVersionSupported(clientVersion: number): boolean {
    return clientVersion >= MIN_CLIENT_VERSION;
}

// int 버전을 문자열로 변환 (디버깅용)
export function getVersionString(version: number): string {
    const major = Math.floor(version / 100);
    const minor = Math.floor((version % 100) / 10);
    const patch = version % 10;
    return `${major}.${minor}.${patch}`;
} 