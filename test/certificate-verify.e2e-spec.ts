import { INestApplication, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { QrService } from '../src/certificate/qr.service'
import { VerificationController } from '../src/certificate/verification.controller'
import { VerificationService } from '../src/certificate/verification.service'

/**
 * Эндпоинты проверки/QR должны быть публичными (без авторизации):
 * verify отдаёт результат и 404 на отсутствующий, qr — PNG-картинку.
 */
describe('Проверка сертификата (e2e)', () => {
	let app: INestApplication
	const verify = jest.fn()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [VerificationController],
			providers: [
				{ provide: VerificationService, useValue: { verify } },
				QrService,
				{ provide: ConfigService, useValue: { get: () => undefined } }
			]
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	it('публично отдаёт результат проверки (200, без авторизации)', async () => {
		verify.mockResolvedValue({
			certificateId: 'CERT123',
			fullName: 'Иван Иванов',
			status: 'valid',
			valid: true
		})

		await request(app.getHttpServer())
			.get('/certificate/verify/CERT123')
			.expect(200)
			.expect(res => {
				if (res.body.status !== 'valid') {
					throw new Error('ожидался status=valid')
				}
			})
	})

	it('возвращает 404 для отсутствующего сертификата', async () => {
		verify.mockRejectedValue(new NotFoundException('Сертификат не найден'))

		await request(app.getHttpServer())
			.get('/certificate/verify/UNKNOWN')
			.expect(404)
	})

	it('публично отдаёт QR-код как image/png', async () => {
		await request(app.getHttpServer())
			.get('/certificate/CERT123/qr')
			.expect(200)
			.expect('Content-Type', /image\/png/)
	})
})
