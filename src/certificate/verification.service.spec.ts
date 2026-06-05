import { NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { VerificationService } from './verification.service'

describe('VerificationService', () => {
	let service: VerificationService
	let prisma: { report: { findUnique: jest.Mock } }

	const baseReport = {
		certificateId: 'CERT123',
		fullName: 'Иван Иванов',
		workplace: 'Кафе «Лето»',
		position: 'Повар',
		phone: '+998901234567',
		issueDate: new Date('2025-01-01'),
		expiryDate: new Date('2099-01-01'),
		isDeleted: false
	}

	beforeEach(() => {
		prisma = { report: { findUnique: jest.fn() } }
		service = new VerificationService(prisma as unknown as PrismaService)
	})

	it('возвращает status=valid для действующего сертификата', async () => {
		prisma.report.findUnique.mockResolvedValue(baseReport)

		const result = await service.verify('CERT123')

		expect(result.status).toBe('valid')
		expect(result.valid).toBe(true)
		expect(result.fullName).toBe('Иван Иванов')
	})

	it('не раскрывает телефон в ответе', async () => {
		prisma.report.findUnique.mockResolvedValue(baseReport)

		const result = await service.verify('CERT123')

		expect(result).not.toHaveProperty('phone')
	})

	it('возвращает status=expired для истёкшего сертификата', async () => {
		prisma.report.findUnique.mockResolvedValue({
			...baseReport,
			expiryDate: new Date('2000-01-01')
		})

		const result = await service.verify('CERT123')

		expect(result.status).toBe('expired')
		expect(result.valid).toBe(false)
	})

	it('возвращает status=revoked для архивного сертификата (даже не истёкшего)', async () => {
		prisma.report.findUnique.mockResolvedValue({
			...baseReport,
			isDeleted: true
		})

		const result = await service.verify('CERT123')

		expect(result.status).toBe('revoked')
		expect(result.valid).toBe(false)
	})

	it('бросает NotFound, если сертификат не найден', async () => {
		prisma.report.findUnique.mockResolvedValue(null)

		await expect(service.verify('CERT123')).rejects.toThrow(NotFoundException)
	})

	it('бросает NotFound и не обращается в БД при некорректном формате', async () => {
		await expect(service.verify('bad id!')).rejects.toThrow(NotFoundException)
		expect(prisma.report.findUnique).not.toHaveBeenCalled()
	})
})
