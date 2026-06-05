import { Controller, Get, Param } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { VerificationService } from './verification.service'

@Controller('certificate')
export class VerificationController {
	constructor(private readonly verificationService: VerificationService) {}

	// Публичная проверка подлинности сертификата (без авторизации).
	// Чуть строже общего лимита, чтобы ограничить перебор certificateId.
	@Throttle({ default: { limit: 30, ttl: 60000 } })
	@Get('verify/:certificateId')
	verify(@Param('certificateId') certificateId: string) {
		return this.verificationService.verify(certificateId)
	}
}
