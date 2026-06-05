import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

export type CertificateStatus = 'valid' | 'expired' | 'revoked'

export interface CertificateVerification {
	certificateId: string
	fullName: string
	workplace: string
	position: string
	issueDate: Date
	expiryDate: Date
	status: CertificateStatus
	valid: boolean
}

@Injectable()
export class VerificationService {
	constructor(private readonly prisma: PrismaService) {}

	async verify(certificateId: string): Promise<CertificateVerification> {
		// Некорректный формат не ищем в БД (тот же набор символов, что при выдаче)
		if (!/^[A-Za-z0-9_-]+$/.test(certificateId)) {
			throw new NotFoundException('Сертификат не найден')
		}

		const report = await this.prisma.report.findUnique({
			where: { certificateId }
		})

		if (!report) {
			throw new NotFoundException('Сертификат не найден')
		}

		const status: CertificateStatus = report.isDeleted
			? 'revoked'
			: report.expiryDate.getTime() < Date.now()
				? 'expired'
				: 'valid'

		// Телефон намеренно не отдаём: для проверки подлинности он не нужен
		return {
			certificateId: report.certificateId,
			fullName: report.fullName,
			workplace: report.workplace,
			position: report.position,
			issueDate: report.issueDate,
			expiryDate: report.expiryDate,
			status,
			valid: status === 'valid'
		}
	}
}
