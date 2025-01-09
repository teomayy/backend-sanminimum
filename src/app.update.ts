import * as fs from 'fs'
import * as phoneUtil from 'google-libphonenumber'
import { InjectBot, On, Start, Update } from 'nestjs-telegraf'
import { Context, Markup, Telegraf } from 'telegraf'
import { CertificateService } from './certificate/certificate.service'
import { NotificationService } from './notification/notification.service'

@Update()
export class AppUpdate {
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

	async onContact(ctx: Context) {
		if (!ctx.message || !('contact' in ctx.message)) {
			await ctx.reply(
				'Пожалуйста, отправьте свой контакт, чтобы связать номер телефона с сертификатом.'
			)
			return
		}

		const contactPhone = ctx.message.contact.phone_number

		console.log('TELLLLL', contactPhone)

		// Нормализация номера телефона
		const phoneInstance = phoneUtil.PhoneNumberUtil.getInstance()
		let normalizedPhone: string
		try {
			const parsedNumber = phoneInstance.parseAndKeepRawInput(
				contactPhone,
				'UZ'
			) // Укажите вашу страну
			normalizedPhone = phoneInstance.format(
				parsedNumber,
				phoneUtil.PhoneNumberFormat.E164
			) // Формат +1234567890
		} catch (error) {
			await ctx.reply(
				'Некорректный номер телефона. Пожалуйста, попробуйте ещё раз.'
			)
			return
		}

		const certificate =
			await this.certificateService.generateCertificate(normalizedPhone)

		if (certificate) {
			await ctx.replyWithDocument({
				source: certificate,
				filename: 'Сертификат.pdf'
			})
		} else {
			await ctx.reply('Для вашего номера телефона не найдено сертификатов.')
		}
	}

	@On('contact')
	async handleContact(ctx: Context) {
		const contact = ctx.message['contact']
		const phone = contact.phone_number

		if (!phone) {
			await ctx.reply(
				'Не удалось получить ваш номер телефона. Попробуйте еще раз.'
			)
			return
		}

		const phoneInstance = phoneUtil.PhoneNumberUtil.getInstance()
		let normalizedPhone: string
		try {
			const parsedNumber = phoneInstance.parseAndKeepRawInput(phone, 'UZ')
			normalizedPhone = phoneInstance.format(
				parsedNumber,
				phoneUtil.PhoneNumberFormat.E164
			)
		} catch (error) {
			await ctx.reply(
				'Некорректный номер телефона. Пожалуйста, попробуйте ещё раз.'
			)
			return
		}

		const chatId = ctx.chat.id.toString()
		await this.notificationService.saveUserContact(normalizedPhone, chatId)

		// Поиск отчета в базе данных
		const report =
			await this.notificationService.findReportByPhone(normalizedPhone)
		if (!report) {
			await ctx.reply('Для вашего номера телефона не найдено сертификатов.')
			return
		}

		// Генерация сертификата

		const certificatePath =
			await this.certificateService.generateCertificate(report)

		if (!fs.existsSync(certificatePath)) {
			await ctx.reply('Произошла ошибка при создании сертификата.')
			return
		}

		// Отправка сертификата пользователю
		await this.bot.telegram.sendPhoto(chatId, { source: certificatePath })
		await ctx.reply('Ваш сертификат успешно отправлен!')
	}

	// @On('text')
	// async handleText(ctx: Context) {
	// 	await ctx.reply(
	// 		'Пожалуйста, отправьте ваш контакт, чтобы мы могли найти ваш сертификат.'
	// 	)
	// }
}
