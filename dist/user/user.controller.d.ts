import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    findAll(): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    }[]>;
    findById(id: string): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    } | null>;
}
