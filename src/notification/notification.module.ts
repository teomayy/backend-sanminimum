import { Module } from '@nestjs/common'
import { EskizModule } from 'src/eskiz/eskiz.module'
import { PrismaService } from 'src/prisma.service'
import { NotificationService } from './notification.service'

@Module({
	imports: [EskizModule],
	providers: [NotificationService, PrismaService],
	exports: [NotificationService]
})
export class NotificationModule {}
