import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name)

	async sendSms(phone: string, message: string): Promise<void> {
		try {
			const response = await axios.post(
				'http://api.eskiz.uz/sms/send',
				{
					mobile_phone: phone,
					message: message
				},
				{
					headers: {
						Authorization: `Bearer ` // TOKEN FROM eskiz
					}
				}
			)
			if (response.data.status === 'success') {
				this.logger.log(`SMS sent to ${phone}: ${message}`)
			} else {
				this.logger.log(`Failed to send SMS: ${response.data.message}`)
			}
		} catch (error) {
			this.logger.log(`Error sending SMS to ${phone}:`, error.message)
		}
	}
}
