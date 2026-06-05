import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as QRCode from 'qrcode'

@Injectable()
export class QrService {
	constructor(private readonly configService: ConfigService) {}

	/** URL публичной проверки, который кодируется в QR. */
	buildVerifyUrl(certificateId: string): string {
		const base = (
			this.configService.get<string>('PUBLIC_BASE_URL') ??
			'http://localhost:4200'
		).replace(/\/+$/, '')
		return `${base}/api/certificate/verify/${certificateId}`
	}

	/** PNG-изображение QR-кода со ссылкой на проверку сертификата. */
	async generateQr(certificateId: string): Promise<Buffer> {
		// Тот же набор символов, что и при выдаче — мусор не кодируем
		if (!/^[A-Za-z0-9_-]+$/.test(certificateId)) {
			throw new NotFoundException('Сертификат не найден')
		}

		return QRCode.toBuffer(this.buildVerifyUrl(certificateId), {
			type: 'png',
			width: 300,
			margin: 1
		})
	}
}
