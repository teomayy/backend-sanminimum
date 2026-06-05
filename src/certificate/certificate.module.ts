import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CertificateService } from './certificate.service'
import { QrService } from './qr.service'
import { VerificationController } from './verification.controller'
import { VerificationService } from './verification.service'

@Module({
	controllers: [VerificationController],
	providers: [CertificateService, VerificationService, QrService, PrismaService],
	exports: [CertificateService]
})
export class CertificateModule {}
