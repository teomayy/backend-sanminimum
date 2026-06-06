import { ModuleRef } from '@nestjs/core'
import { TelegramService } from './telegram.service'

describe('TelegramService', () => {
	it('отправляет сообщение через резолвнутого бота', async () => {
		const sendMessage = jest.fn().mockResolvedValue(undefined)
		const moduleRef = {
			get: jest.fn().mockReturnValue({ telegram: { sendMessage } })
		}

		const service = new TelegramService(moduleRef as unknown as ModuleRef)
		await service.sendMessage('chat1', 'привет')

		expect(moduleRef.get).toHaveBeenCalledWith(expect.anything(), {
			strict: false
		})
		expect(sendMessage).toHaveBeenCalledWith('chat1', 'привет')
	})
})
