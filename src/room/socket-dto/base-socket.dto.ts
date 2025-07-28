export class BaseSocketDto {
    responseEventName: string;
    success: boolean = true;
    code?: number;
    message?: string;
}
