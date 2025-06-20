import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(email: string, password: string, nickname: string): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        message: string;
        user?: undefined;
    } | {
        message: string;
        user: {
            id: number;
            email: string;
            passwordHash: string;
            nickname: string;
            createdAt: Date;
        };
    }>;
}
