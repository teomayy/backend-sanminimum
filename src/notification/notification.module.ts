import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { NotificationService } from './notification.service'

@Module({
	providers: [NotificationService, PrismaService],
	exports: [NotificationService]
})
export class NotificationModule {}
