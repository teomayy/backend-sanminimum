import { ConflictException, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { PrismaService } from 'src/prisma.service'
import { AdminService } from './admin.service'

jest.mock('argon2')

const mockedHash = argon2.hash as unknown as jest.Mock

describe('AdminService', () => {
	let service: AdminService
	let prisma: {
		admin: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
		doctor: {
			findUnique: jest.Mock
			findMany: jest.Mock
			create: jest.Mock
			delete: jest.Mock
			count: jest.Mock
		}
		report: {
			findUnique: jest.Mock
			findMany: jest.Mock
			update: jest.Mock
			count: jest.Mock
		}
	}

	beforeEach(() => {
		prisma = {
			admin: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn()
			},
			doctor: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				delete: jest.fn(),
				count: jest.fn()
			},
			report: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
				count: jest.fn()
			}
		}
		mockedHash.mockReset()
		mockedHash.mockResolvedValue('hashed')

		service = new AdminService(prisma as unknown as PrismaService)
	})

	describe('getById / getByLogin', () => {
		it('getById возвращает админа, если найден', async () => {
			prisma.admin.findUnique.mockResolvedValue({ id: 'a1' })
			await expect(service.getById('a1')).resolves.toEqual({ id: 'a1' })
		})

		it('getById бросает NotFound, если не найден', async () => {
			prisma.admin.findUnique.mockResolvedValue(null)
			await expect(service.getById('a1')).rejects.toThrow(NotFoundException)
		})

		it('getByLogin бросает NotFound, если не найден', async () => {
			prisma.admin.findUnique.mockResolvedValue(null)
			await expect(service.getByLogin('nope')).rejects.toThrow(NotFoundException)
		})
	})

	describe('createDoctor', () => {
		const dto = { login: 'doc', name: 'Доктор', password: 'pw' }

		it('бросает Conflict, если логин занят', async () => {
			prisma.doctor.findUnique.mockResolvedValue({ id: 'd1' })

			await expect(service.createDoctor(dto)).rejects.toThrow(ConflictException)
			expect(prisma.doctor.create).not.toHaveBeenCalled()
		})

		it('хеширует пароль и создаёт врача', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)
			prisma.doctor.create.mockResolvedValue({ id: 'd1' })

			await service.createDoctor(dto)

			expect(mockedHash).toHaveBeenCalledWith('pw')
			expect(prisma.doctor.create).toHaveBeenCalledWith({
				data: { login: 'doc', name: 'Доктор', password: 'hashed' }
			})
		})
	})

	describe('deleteDoctor', () => {
		it('бросает NotFound, если врач не найден', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)

			await expect(service.deleteDoctor('d1')).rejects.toThrow(NotFoundException)
			expect(prisma.doctor.delete).not.toHaveBeenCalled()
		})

		it('физически удаляет существующего врача', async () => {
			prisma.doctor.findUnique.mockResolvedValue({ id: 'd1' })
			prisma.doctor.delete.mockResolvedValue({ id: 'd1' })

			await service.deleteDoctor('d1')

			expect(prisma.doctor.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
		})
	})

	describe('deleteReport (soft-delete)', () => {
		it('бросает NotFound, если отчёт не найден', async () => {
			prisma.report.findUnique.mockResolvedValue(null)

			await expect(service.deleteReport('r1')).rejects.toThrow(NotFoundException)
			expect(prisma.report.update).not.toHaveBeenCalled()
		})

		it('помечает отчёт isDeleted=true, а не удаляет физически', async () => {
			prisma.report.findUnique.mockResolvedValue({ id: 'r1' })
			prisma.report.update.mockResolvedValue({ id: 'r1', isDeleted: true })

			await service.deleteReport('r1')

			expect(prisma.report.update).toHaveBeenCalledWith({
				where: { id: 'r1' },
				data: { isDeleted: true }
			})
		})
	})

	describe('getReportDetails', () => {
		it('бросает NotFound, если справка не найдена', async () => {
			prisma.report.findUnique.mockResolvedValue(null)
			await expect(service.getReportDetails('r1')).rejects.toThrow(
				NotFoundException
			)
		})

		it('возвращает справку с врачом', async () => {
			prisma.report.findUnique.mockResolvedValue({ id: 'r1', doctor: {} })
			await expect(service.getReportDetails('r1')).resolves.toEqual({
				id: 'r1',
				doctor: {}
			})
		})
	})

	describe('getAllDoctors (пагинация)', () => {
		it('без page/limit не задаёт skip/take, включает reports', async () => {
			prisma.doctor.findMany.mockResolvedValue([])

			await service.getAllDoctors()

			expect(prisma.doctor.findMany).toHaveBeenCalledWith({
				include: { reports: true },
				skip: undefined,
				take: undefined
			})
		})

		it('с page=2,limit=5 вычисляет skip=5,take=5', async () => {
			prisma.doctor.findMany.mockResolvedValue([])

			await service.getAllDoctors(2, 5)

			expect(prisma.doctor.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 5, take: 5 })
			)
		})
	})

	describe('getReports', () => {
		it('по умолчанию сортирует createdAt asc, без skip/take', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReports({})

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {},
					orderBy: { createdAt: 'asc' },
					include: { doctor: true },
					skip: undefined,
					take: undefined
				})
			)
		})

		it('status=deleted фильтрует isDeleted=true', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReports({ status: 'deleted' })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { isDeleted: true } })
			)
		})

		it('некорректный order приводится к asc', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReports({ order: 'decs' })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ orderBy: { createdAt: 'asc' } })
			)
		})

		it('order=desc сохраняется', async () => {
			prisma.report.findMany.mockResolvedValue([])

			await service.getReports({ order: 'desc', sortBy: 'issueDate' })

			expect(prisma.report.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ orderBy: { issueDate: 'desc' } })
			)
		})
	})

	describe('getStatistics', () => {
		it('агрегирует счётчики врачей и отчётов', async () => {
			prisma.doctor.count.mockResolvedValue(3)
			prisma.report.count
				.mockResolvedValueOnce(10) // active (isDeleted: false)
				.mockResolvedValueOnce(4) // archived (isDeleted: true)

			const stats = await service.getStatistics()

			expect(stats).toEqual({
				doctorCount: 3,
				activeReportsCount: 10,
				archivedReportsCount: 4
			})
		})
	})
})
