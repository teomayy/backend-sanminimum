import { Controller, Get, Param, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { QrService } from './qr.service'
import { VerificationService } from './verification.service'

@Controller('certificate')
export class VerificationController {
	constructor(
		private readonly verificationService: VerificationService,
		private readonly qrService: QrService
	) {}

	// Публичная проверка подлинности сертификата (без авторизации).
	// Чуть строже общего лимита, чтобы ограничить перебор certificateId.
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@Get('verify/:certificateId')
	verify(@Param('certificateId') certificateId: string) {
		return this.verificationService.verify(certificateId)
	}

	// Публичный QR-код (PNG) со ссылкой на проверку — для печати на справке.
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@Get(':certificateId/qr')
	async qr(
		@Param('certificateId') certificateId: string,
		@Res() res: Response
	) {
		const png = await this.qrService.generateQr(certificateId)
		res.setHeader('Content-Type', 'image/png')
		res.send(png)
	}
}
