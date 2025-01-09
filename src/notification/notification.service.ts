import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EskizService } from 'src/eskiz/eskiz.service'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly eskizService: EskizService
	) {}

	async notifyOnReportCreation(
		phoneNumber: string,
		fullName: string
	): Promise<void> {
		const message = `Здравствуйте, ${fullName}! Вы можете получить ваш сертификат через телеграм-бот: https://t.me/SesCertificateBot`
		await this.eskizService.sendSms(phoneNumber, message)
	}

	async saveUserContact(phone: string, chatId: string) {
		await this.prisma.telegramUser.upsert({
			where: { phone },
			update: { chatId },
			create: { phone, chatId }
		})
	}

	async findReportByPhone(phone: string) {
		return await this.prisma.report.findFirst({ where: { phone } })
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async notifyBeforeExpiry(): Promise<void> {
		const today = new Date()
		const tenDaysLater = new Date(today)
		tenDaysLater.setDate(today.getDate() + 10)

		const reports = await this.prisma.report.findMany({
			where: {
				expiryDate: {
					gte: today,
					lte: tenDaysLater
				}
			}
		})
		for (const report of reports) {
			const message = `Здравствуйте, ${report.fullName}! Ваш сертификат истекает через 10 дней. Пожалуйста, продлите его, чтобы избежать проблем.`
			await this.eskizService.sendSms(report.phone, message)
			this.logger.log(`Уведомление отправлено: ${report.phone}`)
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async notifyAfterExpiry(): Promise<void> {
		const today = new Date()

		const expiredReports = await this.prisma.report.findMany({
			where: {
				expiryDate: {
					lt: today
				}
			}
		})
		for (const report of expiredReports) {
			const message = `Здравствуйте, ${report.fullName}! Срок действия вашего сертификата истёк. Пожалуйста, продлите его как можно скорее.`
			await this.eskizService.sendSms(report.phone, message)
			this.logger.log(`Уведомление отправлено: ${report.phone}`)
		}
	}
}
