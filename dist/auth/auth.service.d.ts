import { UserService } from '../user/user.service';
export declare class AuthService {
    private readonly userService;
    constructor(userService: UserService);
    register(email: string, password: string, nickname: string): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    }>;
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    } | null>;
}
