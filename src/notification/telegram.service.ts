import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { getBotToken } from 'nestjs-telegraf'
import { Telegraf } from 'telegraf'

/**
 * Тонкая обёртка для отправки сообщений ботом из сервисов вне AppModule.
 * Бот резолвится через ModuleRef (strict:false), без повторной инициализации
 * TelegrafModule.
 */
@Injectable()
export class TelegramService {
	constructor(private readonly moduleRef: ModuleRef) {}

	async sendMessage(chatId: string, text: string): Promise<void> {
		const bot = this.moduleRef.get<Telegraf>(getBotToken(), { strict: false })
		await bot.telegram.sendMessage(chatId, text)
	}
}
