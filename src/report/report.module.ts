import { Module } from '@nestjs/common'
import { CertificateModule } from 'src/certificate/certificate.module'
import { NotificationModule } from 'src/notification/notification.module'
import { PrismaService } from 'src/prisma.service'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
	imports: [NotificationModule, CertificateModule],
	controllers: [ReportController],
	providers: [ReportService, PrismaService]
})
export class ReportModule {}
