import { Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as phoneUtil from 'google-libphonenumber'
import { InjectBot, On, Start, Update } from 'nestjs-telegraf'
import { Context, Markup, Telegraf } from 'telegraf'
import { CertificateService } from './certificate/certificate.service'
import { Retryable } from './decorators/retryable.decorator'
import { NotificationService } from './notification/notification.service'

@Update()
export class AppUpdate {
	private readonly logger = new Logger(AppUpdate.name)

	constructor(
		@InjectBot() private readonly bot: Telegraf<Context>,
		private readonly certificateService: CertificateService,
		private readonly notificationService: NotificationService
	) {}

	@Start()
	async startCommand(ctx: Context) {
		await ctx.reply(
			'Добро пожаловать! Отправьте ваш контакт, чтобы мы могли найти ваш сертификат.',
			Markup.keyboard([Markup.button.contactRequest('Отправить контакт')])
				.resize()
				.oneTime()
		)
	}

	@On('contact')
	async handleContact(ctx: Context) {
		const contact = ctx.message?.['contact']
		const phone = contact?.phone_number

		if (!phone) {
			await ctx.reply(
				'Не удалось получить ваш номер телефона. Попробуйте ещё раз.'
			)
			return
		}

		let normalizedPhone: string
		try {
			const phoneInstance = phoneUtil.PhoneNumberUtil.getInstance()
			const parsedNumber = phoneInstance.parseAndKeepRawInput(phone, 'UZ')
			normalizedPhone = phoneInstance.format(
				parsedNumber,
				phoneUtil.PhoneNumberFormat.E164
			)
		} catch (error) {
			this.logger.warn('Ошибка нормализации номера', error)
			await ctx.reply(
				'Некорректный номер телефона. Пожалуйста, попробуйте ещё раз.'
			)
			return
		}

		const chatId = ctx.chat.id.toString()
		await this.notificationService.saveUserContact(normalizedPhone, chatId)

		const report =
			await this.notificationService.findReportByPhone(normalizedPhone)

		if (!report) {
			await ctx.reply('Для вашего номера телефона не найдено сертификатов.')
			return
		}

		const certificatePath =
			await this.certificateService.generateCertificate(report)

		if (!fs.existsSync(certificatePath)) {
			this.logger.error('Файл сертификата не найден:', certificatePath)
			await ctx.reply('Произошла ошибка при создании сертификата.')
			return
		}

		try {
			await this.sendCertificate(chatId, certificatePath, report.fullName)
			await ctx.reply('Ваш сертификат успешно отправлен!')
		} catch (error) {
			this.logger.error('Ошибка при отправке PDF через Telegram', error)
			await ctx.reply(
				'Не удалось отправить сертификат. Попробуйте позже или обратитесь за поддержкой.'
			)
		}
	}

	@Retryable({
		retries: 3,
		delayMs: 1000,
		exponential: true,
		logLabel: 'Telegram.SendDocument',
		retryOn: err =>
			err instanceof Error &&
			(err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET'))
	})
	async sendCertificate(
		chatId: string,
		certificatePath: string,
		fullName: string
	) {
		await this.bot.telegram.sendPhoto(chatId, {
			source: certificatePath,
			filename: `certificate-${fullName.replace(/\s+/g, '_')}.pdf`
		})
	}
}
