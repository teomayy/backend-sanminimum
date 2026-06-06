import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CertificatePdfService } from './certificate-pdf.service'
import { CertificateService } from './certificate.service'
import { QrService } from './qr.service'
import { VerificationController } from './verification.controller'
import { VerificationService } from './verification.service'

@Module({
	controllers: [VerificationController],
	providers: [
		CertificateService,
		CertificatePdfService,
		VerificationService,
		QrService,
		PrismaService
	],
	exports: [CertificateService, CertificatePdfService]
})
export class CertificateModule {}
