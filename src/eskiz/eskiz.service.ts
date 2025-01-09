import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { lastValueFrom } from 'rxjs'

@Injectable()
export class EskizService {
	private token: string

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService
	) {
		this.authenticate()
	}

	private async authenticate() {
		const email = this.configService.get<string>('ESKIZ_EMAIL')
		const password = this.configService.get<string>('ESKIZ_PASSWORD')

		try {
			const response = await lastValueFrom(
				this.httpService.post('https://notify.eskiz.uz/api/auth/login', {
					email,
					password
				})
			)
			this.token = response.data.data.token
		} catch (error) {
			console.error('Ошибка авторизации в Eskiz:', error.message)
			throw new Error('Ошибка авторизации в Eskiz')
		}
	}

	async sendSms(phoneNumber: string, message: string): Promise<void> {
		if (!this.token) {
			await this.authenticate()
		}

		try {
			const response = await lastValueFrom(
				this.httpService.post(
					'https://notify.eskiz.uz/api/message/sms/send',
					new URLSearchParams({
						mobile_phone: phoneNumber,
						message,
						from: 'Sanminimum'
					}),
					{
						headers: {
							Authorization: `Bearer ${this.token}`
						}
					}
				)
			)

			if (response.data.status !== 'ok') {
				console.error('Ошибка отправки SMS через Eskiz:', response.data.message)
				throw new Error('Ошибка отправки SMS через Eskiz')
			}
		} catch (error) {
			console.error('Ошибка отправки SMS через Eskиз:', error.message)
			throw new Error('Ошибка отправки SMS через Eskиз')
		}
	}
}
