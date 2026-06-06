import { PrismaService } from 'src/prisma.service'
import { EskizService } from 'src/eskiz/eskiz.service'
import { NotificationService } from './notification.service'
import { TelegramService } from './telegram.service'

describe('NotificationService (выбор канала)', () => {
	let service: NotificationService
	let prisma: {
		telegramUser: { findUnique: jest.Mock }
		report: { findMany: jest.Mock }
	}
	let eskiz: { sendSms: jest.Mock }
	let telegram: { sendMessage: jest.Mock }

	beforeEach(() => {
		prisma = {
			telegramUser: { findUnique: jest.fn() },
			report: { findMany: jest.fn() }
		}
		eskiz = { sendSms: jest.fn().mockResolvedValue(undefined) }
		telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) }

		service = new NotificationService(
			prisma as unknown as PrismaService,
			eskiz as unknown as EskizService,
			telegram as unknown as TelegramService
		)
	})

	describe('notifyOnReportCreation', () => {
		it('шлёт в Telegram, если есть привязанный chatId (без SMS)', async () => {
			prisma.telegramUser.findUnique.mockResolvedValue({ chatId: 'chat1' })

			await service.notifyOnReportCreation('+998901234567', 'Иван')

			expect(telegram.sendMessage).toHaveBeenCalledWith(
				'chat1',
				expect.stringContaining('Иван')
			)
			expect(eskiz.sendSms).not.toHaveBeenCalled()
		})

		it('шлёт SMS, если привязки нет', async () => {
			prisma.telegramUser.findUnique.mockResolvedValue(null)

			await service.notifyOnReportCreation('+998901234567', 'Иван')

			expect(eskiz.sendSms).toHaveBeenCalledWith(
				'+998901234567',
				expect.stringContaining('Иван')
			)
			expect(telegram.sendMessage).not.toHaveBeenCalled()
		})

		it('падает на SMS, если Telegram-отправка не удалась', async () => {
			prisma.telegramUser.findUnique.mockResolvedValue({ chatId: 'chat1' })
			telegram.sendMessage.mockRejectedValue(new Error('bot blocked'))

			await service.notifyOnReportCreation('+998901234567', 'Иван')

			expect(telegram.sendMessage).toHaveBeenCalled()
			expect(eskiz.sendSms).toHaveBeenCalledWith(
				'+998901234567',
				expect.any(String)
			)
		})
	})

	describe('notifyBeforeExpiry', () => {
		it('рассылает уведомления выбранным каналом', async () => {
			prisma.report.findMany.mockResolvedValue([
				{ phone: '+998901112233', fullName: 'Пётр' }
			])
			prisma.telegramUser.findUnique.mockResolvedValue(null)

			await service.notifyBeforeExpiry()

			expect(eskiz.sendSms).toHaveBeenCalledWith(
				'+998901112233',
				expect.stringContaining('10 дней')
			)
		})
	})
})
