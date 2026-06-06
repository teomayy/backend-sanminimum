import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns'
import { EskizService } from 'src/eskiz/eskiz.service'
import { PrismaService } from 'src/prisma.service'
import { TelegramService } from './telegram.service'

@Injectable()
export class NotificationService {
	private readonly logger = new Logger(NotificationService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly eskizService: EskizService,
		private readonly telegramService: TelegramService
	) {}

	/**
	 * Доставка сообщения получателю: предпочитаем Telegram (бесплатно),
	 * если есть привязанный chatId; SMS — fallback и для непривязанных.
	 */
	private async notifyRecipient(phone: string, message: string): Promise<void> {
		const tgUser = await this.prisma.telegramUser.findUnique({
			where: { phone }
		})

		if (tgUser?.chatId) {
			try {
				await this.telegramService.sendMessage(tgUser.chatId, message)
				return
			} catch (error) {
				this.logger.warn(
					`Telegram не доставлен (${phone}), переключаюсь на SMS: ${(error as Error).message}`
				)
			}
		}

		await this.eskizService.sendSms(phone, message)
	}

	async notifyOnReportCreation(
		phoneNumber: string,
		fullName: string
	): Promise<void> {
		const message = `Уважаемый, ${fullName}! Вы можете получить ваш сертификат через телеграм бот (https://t.me/SesCertificateBot)`
		await this.notifyRecipient(phoneNumber, message)
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
		// Уведомляем ровно за 10 дней до истечения — один раз
		const targetDay = addDays(new Date(), 10)

		const reports = await this.prisma.report.findMany({
			where: {
				isDeleted: false,
				expiryDate: {
					gte: startOfDay(targetDay),
					lte: endOfDay(targetDay)
				}
			}
		})
		for (const report of reports) {
			const message = `Здравствуйте, ${report.fullName}! Ваш сертификат истекает через 10 дней. Пожалуйста, продлите его, чтобы избежать проблем.`
			await this.notifyRecipient(report.phone, message)
			this.logger.log(`Уведомление отправлено: ${report.phone}`)
		}
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async notifyAfterExpiry(): Promise<void> {
		// Уведомляем на следующий день после истечения — один раз,
		// иначе просроченные получали бы SMS каждый день
		const targetDay = subDays(new Date(), 1)

		const expiredReports = await this.prisma.report.findMany({
			where: {
				isDeleted: false,
				expiryDate: {
					gte: startOfDay(targetDay),
					lte: endOfDay(targetDay)
				}
			}
		})
		for (const report of expiredReports) {
			const message = `Здравствуйте, ${report.fullName}! Срок действия вашего сертификата истёк. Пожалуйста, продлите его как можно скорее.`
			await this.notifyRecipient(report.phone, message)
			this.logger.log(`Уведомление отправлено: ${report.phone}`)
		}
	}
}
