import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { NotificationService } from 'src/notification/notification.service'
import { PrismaService } from 'src/prisma.service'
import { ReportService } from './report.service'

describe('ReportService', () => {
	let service: ReportService
	let prisma: {
		report: {
			findFirst: jest.Mock
			findUnique: jest.Mock
			create: jest.Mock
			update: jest.Mock
			findMany: jest.Mock
		}
	}
	let notification: { notifyOnReportCreation: jest.Mock }

	const ownReport = { id: 'r1', doctorId: 'd1', isDeleted: false }

	beforeEach(() => {
		prisma = {
			report: {
				findFirst: jest.fn(),
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				findMany: jest.fn()
			}
		}
		notification = { notifyOnReportCreation: jest.fn() }

		service = new ReportService(
			prisma as unknown as PrismaService,
			notification as unknown as NotificationService
		)
	})

	describe('deleteReport (soft-delete + ownership)', () => {
		it('помечает свой отчёт isDeleted=true', async () => {
			prisma.report.findFirst.mockResolvedValue(ownReport)
			prisma.report.update.mockResolvedValue({ ...ownReport, isDeleted: true })

			await service.deleteReport('r1', 'd1')

			expect(prisma.report.findFirst).toHaveBeenCalledWith({
				where: { id: 'r1', doctorId: 'd1' }
			})
			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: 'r1' },
				data: { isDeleted: true }
			})
		})

		it('бросает NotFound и не трогает чужой отчёт (IDOR)', async () => {
			prisma.report.findFirst.mockResolvedValue(null)

			await expect(service.deleteReport('r1', 'другой')).rejects.toThrow(
				NotFoundException
			)
			expect(prisma.report.update).not.toHaveBeenCalled()
		})
	})

	describe('archiveReport (ownership)', () => {
		it('архивирует свой отчёт', async () => {
			prisma.report.findFirst.mockResolvedValue(ownReport)
			prisma.report.update.mockResolvedValue({ ...ownReport, isDeleted: true })

			await service.archiveReport('r1', 'd1')

			expect(prisma.report.findFirst).toHaveBeenCalledWith({
				where: { id: 'r1', doctorId: 'd1' }
			})
			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: 'r1' },
				data: { isDeleted: true }
			})
		})

		it('бросает NotFound для чужого отчёта (IDOR)', async () => {
			prisma.report.findFirst.mockResolvedValue(null)

			await expect(service.archiveReport('r1', 'другой')).rejects.toThrow(
				NotFoundException
			)
			expect(prisma.report.update).not.toHaveBeenCalled()
		})
	})

	describe('restoreReport (ownership)', () => {
		it('восстанавливает свой отчёт (isDeleted=false)', async () => {
			prisma.report.findFirst.mockResolvedValue({ ...ownReport, isDeleted: true })
			prisma.report.update.mockResolvedValue({ ...ownReport, isDeleted: false })

			await service.restoreReport('r1', 'd1')

			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: 'r1' },
				data: { isDeleted: false }
			})
		})

		it('бросает NotFound для чужого отчёта (IDOR)', async () => {
			prisma.report.findFirst.mockResolvedValue(null)

			await expect(service.restoreReport('r1', 'другой')).rejects.toThrow(
				NotFoundException
			)
			expect(prisma.report.update).not.toHaveBeenCalled()
		})
	})

	describe('updateReport (ownership)', () => {
		it('обновляет свой отчёт', async () => {
			prisma.report.findFirst.mockResolvedValue(ownReport)
			prisma.report.update.mockResolvedValue({ ...ownReport, fullName: 'Новый' })

			await service.updateReport('r1', 'd1', { fullName: 'Новый' })

			expect(prisma.report.findFirst).toHaveBeenCalledWith({
				where: { id: 'r1', doctorId: 'd1' }
			})
			expect(prisma.report.update).toHaveBeenCalled()
		})

		it('бросает NotFound для чужого отчёта (IDOR)', async () => {
			prisma.report.findFirst.mockResolvedValue(null)

			await expect(
				service.updateReport('r1', 'другой', { fullName: 'X' })
			).rejects.toThrow(NotFoundException)
			expect(prisma.report.update).not.toHaveBeenCalled()
		})
	})

	describe('getReportsByDoctor (фильтры и пагинация)', () => {
		it('без фильтров — только doctorId, без skip/take', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReportsByDoctor('d1')

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { doctorId: 'd1' },
					skip: undefined,
					take: undefined
				})
			)
		})

		it('с page=2,limit=10 вычисляет skip=10,take=10', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReportsByDoctor('d1', { page: 2, limit: 10 })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 10, take: 10 })
			)
		})

		it('фильтрует по isDeleted, когда передан', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReportsByDoctor('d1', { isDeleted: true })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { doctorId: 'd1', isDeleted: true }
				})
			)
		})

		it('ищет по ФИО (contains, insensitive)', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReportsByDoctor('d1', { fullName: 'Иван' })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						doctorId: 'd1',
						fullName: { contains: 'Иван', mode: 'insensitive' }
					}
				})
			)
		})

		it('фильтрует по диапазону даты выдачи', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReportsByDoctor('d1', {
				startDate: '2025-01-01',
				endDate: '2025-12-31'
			})

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						doctorId: 'd1',
						issueDate: {
							gte: new Date('2025-01-01'),
							lte: new Date('2025-12-31')
						}
					}
				})
			)
		})
	})

	describe('createReport', () => {
		const baseDto = {
			fullName: 'Иван',
			birthDate: '1990-01-01',
			workplace: 'Кафе',
			position: 'Повар',
			phone: '+998901234567',
			certificateId: 'CERT123',
			issueDate: '2025-01-01'
		}

		it('бросает BadRequest при некорректном телефоне', async () => {
			await expect(
				service.createReport('d1', { ...baseDto, phone: 'abc' })
			).rejects.toThrow(BadRequestException)
			expect(prisma.report.create).not.toHaveBeenCalled()
		})

		it('бросает Conflict, если certificateId уже существует', async () => {
			prisma.report.findUnique.mockResolvedValue({ id: 'existing' })

			await expect(service.createReport('d1', baseDto)).rejects.toThrow(
				ConflictException
			)
			expect(prisma.report.create).not.toHaveBeenCalled()
		})

		it('создаёт отчёт врача и отправляет уведомление', async () => {
			prisma.report.findUnique.mockResolvedValue(null)
			prisma.report.create.mockResolvedValue({
				id: 'r1',
				phone: '+998901234567',
				fullName: 'Иван'
			})

			const result = await service.createReport('d1', baseDto)

			expect(prisma.report.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ doctorId: 'd1' })
				})
			)
			expect(notification.notifyOnReportCreation).toHaveBeenCalledWith(
				'+998901234567',
				'Иван'
			)
			expect(result.id).toBe('r1')
		})
	})
})
