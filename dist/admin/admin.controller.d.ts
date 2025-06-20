import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        userCount: number;
        channelCount: number;
        roomCount: number;
        gameHistoryCount: number;
    }>;
}
