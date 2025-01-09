import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { EskizService } from 'src/eskiz/eskiz.service'
import { PrismaService } from 'src/prisma.service'
import { NotificationService } from './notification.service'

@Module({
	imports: [HttpModule],
	providers: [NotificationService, PrismaService, EskizService],
	exports: [NotificationService]
})
export class NotificationModule {}
