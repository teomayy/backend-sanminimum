import { INestApplication, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { VerificationController } from '../src/certificate/verification.controller'
import { VerificationService } from '../src/certificate/verification.service'

/**
 * Эндпоинт проверки сертификата должен быть публичным (без авторизации)
 * и корректно отдавать 404 на отсутствующий сертификат.
 */
describe('Проверка сертификата (e2e)', () => {
	let app: INestApplication
	const verify = jest.fn()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [VerificationController],
			providers: [{ provide: VerificationService, useValue: { verify } }]
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
})
