// import { Injectable } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') { }

import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    // Guard 실행 전에 로그를 찍어봅니다.
    canActivate(context: ExecutionContext) {
        // AuthGuard('jwt')의 canActivate를 실행합니다.
        return super.canActivate(context);
    }

    // AuthGuard('jwt')에서 에러가 발생했을 때 호출되는 핸들러를 오버라이드합니다.
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            // 🚨 핵심 디버깅 로그! 왜 인증이 실패했는지 info를 찍어봅니다.
            // info 객체에는 'JsonWebTokenError: invalid signature' 또는 'jwt expired' 등의 메시지가 담깁니다.
            this.logger.error(`[JwtAuthGuard Failed] Error: ${err?.message || 'None'}, Info: ${info?.message || 'Unknown'}`, info);

            throw err || new UnauthorizedException();
        }
        return user;
    }
}
