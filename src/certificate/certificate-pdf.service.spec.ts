import { ConfigService } from '@nestjs/config'
import { CertificatePdfService } from './certificate-pdf.service'
import { QrService } from './qr.service'

describe('CertificatePdfService', () => {
	it('генерирует валидный PDF с QR и кириллицей', async () => {
		const qrService = new QrService({
			get: () => undefined
		} as unknown as ConfigService)
		const service = new CertificatePdfService(qrService)

		const pdf = await service.generate({
			certificateId: 'CERT123',
			fullName: 'Иван Иванов',
			workplace: 'Кафе «Лето»',
			position: 'Повар',
			issueDate: new Date('2025-01-01'),
			expiryDate: new Date('2026-01-01')
		})

		expect(Buffer.isBuffer(pdf)).toBe(true)
		// сигнатура PDF
		expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF')
		expect(pdf.length).toBeGreaterThan(1000)
	})
})
