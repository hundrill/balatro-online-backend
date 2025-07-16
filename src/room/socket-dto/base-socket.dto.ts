export class BaseSocketDto {
    eventName: string;
    success: boolean = true;
    code?: number;
    message?: string;
}
