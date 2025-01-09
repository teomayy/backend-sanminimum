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

		const chatId = ctx.chat.id.toString()
		await this.notificationService.saveUserContact(phone, chatId)

		// Поиск отчета в базе данных
		const report = await this.notificationService.findReportByPhone(phone)
		if (!report) {
			await ctx.reply('Для вашего номера телефона не найдено сертификатов.')
			return
		}

		// Генерация сертификата

		const certificatePath =
			await this.certificateService.generateCertificate(report)

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
