import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { NotificationModule } from 'src/notification/notification.module'
import { PrismaService } from 'src/prisma.service'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
	imports: [NotificationModule, ScheduleModule.forRoot()],
	controllers: [ReportController],
	providers: [ReportService, PrismaService]
})
export class ReportModule {}
