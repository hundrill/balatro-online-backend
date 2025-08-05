import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateFeedbackDto {
    content: string;
    parentId?: string;
}

export interface FeedbackWithReplies {
    id: string;
    content: string;
    author: string;
    assignee: string | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    replies: {
        id: string;
        content: string;
        author: string;
        assignee: string | null;
        parentId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[];
}

@Injectable()
export class FeedbackService {
    private readonly logger = new Logger(FeedbackService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createFeedback(data: CreateFeedbackDto) {
        try {
            const feedback = await this.prisma.feedback.create({
                data: {
                    content: data.content,
                    author: 'Anonymous', // 기본 작성자
                    assignee: null,
                    parentId: data.parentId || null,
                },
            });

            this.logger.log(`[Feedback] 피드백 생성 완료: ${feedback.id}`);
            return feedback;
        } catch (error) {
            this.logger.error('[Feedback] 피드백 생성 실패:', error);
            throw error;
        }
    }

    async getAllFeedbacks(): Promise<FeedbackWithReplies[]> {
        try {
            const feedbacks = await this.prisma.feedback.findMany({
                where: {
                    parentId: null, // 최상위 댓글만 가져오기
                },
                include: {
                    replies: {
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return feedbacks;
        } catch (error) {
            this.logger.error('[Feedback] 피드백 목록 조회 실패:', error);
            throw error;
        }
    }

    async deleteFeedback(id: string) {
        try {
            await this.prisma.feedback.delete({
                where: { id },
            });

            this.logger.log(`[Feedback] 피드백 삭제 완료: ${id}`);
            return { success: true };
        } catch (error) {
            this.logger.error('[Feedback] 피드백 삭제 실패:', error);
            throw error;
        }
    }
} 