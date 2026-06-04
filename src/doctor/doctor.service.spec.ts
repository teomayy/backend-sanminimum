import { ConflictException, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { PrismaService } from 'src/prisma.service'
import { DoctorService } from './doctor.service'

jest.mock('argon2')

const mockedHash = argon2.hash as unknown as jest.Mock

describe('DoctorService', () => {
	let service: DoctorService
	let prisma: {
		doctor: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
		report: { count: jest.Mock }
	}

	beforeEach(() => {
		prisma = {
			doctor: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn()
			},
			report: { count: jest.fn() }
		}
		mockedHash.mockReset()
		mockedHash.mockResolvedValue('hashed')

		service = new DoctorService(prisma as unknown as PrismaService)
	})

	describe('getById', () => {
		it('возвращает врача, если найден', async () => {
			prisma.doctor.findUnique.mockResolvedValue({ id: 'd1' })
			await expect(service.getById('d1')).resolves.toEqual({ id: 'd1' })
		})

		it('бросает NotFound, если не найден', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)
			await expect(service.getById('d1')).rejects.toThrow(NotFoundException)
		})
	})

	describe('getByLogin', () => {
		it('делегирует findUnique и возвращает null, если нет', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)
			await expect(service.getByLogin('nope')).resolves.toBeNull()
			expect(prisma.doctor.findUnique).toHaveBeenCalledWith({
				where: { login: 'nope' }
			})
		})
	})

	describe('getProfile', () => {
		it('возвращает профиль и статистику отчётов', async () => {
			prisma.doctor.findUnique.mockResolvedValue({ id: 'd1', name: 'Доктор' })
			prisma.report.count
				.mockResolvedValueOnce(5) // total
				.mockResolvedValueOnce(2) // expired
				.mockResolvedValueOnce(1) // expiring soon

			const result = await service.getProfile('d1')

			expect(result).toEqual({
				doctor: { id: 'd1', name: 'Доктор' },
				statistics: {
					totalReports: 5,
					expiredReports: 2,
					expiringSoonReports: 1
				}
			})
		})

		it('бросает NotFound, если врач не найден', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)
			await expect(service.getProfile('d1')).rejects.toThrow(NotFoundException)
			expect(prisma.report.count).not.toHaveBeenCalled()
		})
	})

	describe('create', () => {
		it('бросает Conflict, если логин занят', async () => {
			prisma.doctor.findUnique.mockResolvedValue({ id: 'd1' })

			await expect(
				service.create({ login: 'doc', password: 'pw' })
			).rejects.toThrow(ConflictException)
			expect(prisma.doctor.create).not.toHaveBeenCalled()
		})

		it('хеширует пароль и создаёт врача с пустым именем', async () => {
			prisma.doctor.findUnique.mockResolvedValue(null)
			prisma.doctor.create.mockResolvedValue({ id: 'd1' })

			await service.create({ login: 'doc', password: 'pw' })

			expect(mockedHash).toHaveBeenCalledWith('pw')
			expect(prisma.doctor.create).toHaveBeenCalledWith({
				data: { login: 'doc', name: '', password: 'hashed' }
			})
		})
	})

	describe('update', () => {
		it('обновляет без хеширования, если пароль не передан', async () => {
			prisma.doctor.update.mockResolvedValue({ name: 'Новый' })

			await service.update('d1', { name: 'Новый' })

			expect(mockedHash).not.toHaveBeenCalled()
			expect(prisma.doctor.update).toHaveBeenCalledWith({
				where: { id: 'd1' },
				data: { name: 'Новый' },
				select: { name: true }
			})
		})

		it('хеширует новый пароль при обновлении', async () => {
			prisma.doctor.update.mockResolvedValue({ name: 'Доктор' })

			await service.update('d1', { password: 'newpw' })

			expect(mockedHash).toHaveBeenCalledWith('newpw')
			expect(prisma.doctor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ password: 'hashed' })
				})
			)
		})
	})

	describe('refresh token', () => {
		it('saveRefreshToken пишет токен', async () => {
			prisma.doctor.update.mockResolvedValue({})
			await service.saveRefreshToken('d1', 'rt')
			expect(prisma.doctor.update).toHaveBeenCalledWith({
				where: { id: 'd1' },
				data: { refreshToken: 'rt' }
			})
		})

		it('clearRefreshToken обнуляет токен', async () => {
			prisma.doctor.update.mockResolvedValue({})
			await service.clearRefreshToken('d1')
			expect(prisma.doctor.update).toHaveBeenCalledWith({
				where: { id: 'd1' },
				data: { refreshToken: null }
			})
		})
	})
})
