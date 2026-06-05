import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { QrService } from './qr.service'

describe('QrService', () => {
	let service: QrService
	let config: { get: jest.Mock }

	beforeEach(() => {
		config = { get: jest.fn() }
		service = new QrService(config as unknown as ConfigService)
	})

	describe('buildVerifyUrl', () => {
		it('использует дефолтный базовый URL, если PUBLIC_BASE_URL не задан', () => {
			config.get.mockReturnValue(undefined)
			expect(service.buildVerifyUrl('CERT123')).toBe(
				'http://localhost:4200/api/certificate/verify/CERT123'
			)
		})

		it('обрезает завершающий слеш у PUBLIC_BASE_URL', () => {
			config.get.mockReturnValue('https://sanmin.uz/')
			expect(service.buildVerifyUrl('CERT123')).toBe(
				'https://sanmin.uz/api/certificate/verify/CERT123'
			)
		})
	})

	describe('generateQr', () => {
		it('возвращает PNG-буфер', async () => {
			config.get.mockReturnValue(undefined)
			const png = await service.generateQr('CERT123')

			expect(Buffer.isBuffer(png)).toBe(true)
			// сигнатура PNG: 89 50 4E 47
			expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
		})

		it('бросает NotFound при некорректном формате', async () => {
			await expect(service.generateQr('bad id!')).rejects.toThrow(
				NotFoundException
			)
		})
	})
})
