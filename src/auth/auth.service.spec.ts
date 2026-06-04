import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { AdminService } from 'src/admin/admin.service'
import { DoctorService } from 'src/doctor/doctor.service'
import { AuthService } from './auth.service'

jest.mock('argon2')

const mockedVerify = argon2.verify as unknown as jest.Mock

describe('AuthService', () => {
	let service: AuthService
	let jwt: { sign: jest.Mock; verifyAsync: jest.Mock }
	let doctorService: {
		getByLogin: jest.Mock
		getById: jest.Mock
		saveRefreshToken: jest.Mock
		clearRefreshToken: jest.Mock
	}
	let adminService: {
		getByLogin: jest.Mock
		getById: jest.Mock
		saveRefreshToken: jest.Mock
		clearRefreshToken: jest.Mock
	}
	let config: { get: jest.Mock }

	beforeEach(() => {
		jwt = {
			sign: jest.fn().mockReturnValue('token'),
			verifyAsync: jest.fn()
		}
		doctorService = {
			getByLogin: jest.fn(),
			getById: jest.fn(),
			saveRefreshToken: jest.fn(),
			clearRefreshToken: jest.fn()
		}
		adminService = {
			getByLogin: jest.fn(),
			getById: jest.fn(),
			saveRefreshToken: jest.fn(),
			clearRefreshToken: jest.fn()
		}
		config = { get: jest.fn() }
		mockedVerify.mockReset()

		service = new AuthService(
			jwt as unknown as JwtService,
			doctorService as unknown as DoctorService,
			adminService as unknown as AdminService,
			config as unknown as ConfigService
		)
	})

	describe('login', () => {
		it('логинит врача с верными учётными данными, не возвращает пароль', async () => {
			doctorService.getByLogin.mockResolvedValue({
				id: 'd1',
				login: 'doc',
				password: 'hash',
				role: 'doctor',
				name: 'Доктор'
			})
			mockedVerify.mockResolvedValue(true)
			jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh')

			const result = await service.login({ login: 'doc', password: 'pw' })

			expect(result.accessToken).toBe('access')
			expect(result.refreshToken).toBe('refresh')
			expect(result.user).not.toHaveProperty('password')
			expect(result.user.role).toBe('doctor')
			expect(doctorService.saveRefreshToken).toHaveBeenCalledWith(
				'd1',
				'refresh'
			)
			expect(adminService.saveRefreshToken).not.toHaveBeenCalled()
		})

		it('логинит админа, если врач с таким логином не найден', async () => {
			doctorService.getByLogin.mockResolvedValue(null)
			adminService.getByLogin.mockResolvedValue({
				id: 'a1',
				login: 'adm',
				password: 'hash',
				role: 'admin',
				name: 'Админ'
			})
			mockedVerify.mockResolvedValue(true)
			jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh')

			const result = await service.login({ login: 'adm', password: 'pw' })

			expect(result.user.role).toBe('admin')
			expect(adminService.saveRefreshToken).toHaveBeenCalledWith('a1', 'refresh')
			expect(doctorService.saveRefreshToken).not.toHaveBeenCalled()
		})

		it('бросает NotFoundException, если пользователь не найден', async () => {
			doctorService.getByLogin.mockResolvedValue(null)
			adminService.getByLogin.mockResolvedValue(null)

			await expect(
				service.login({ login: 'nobody', password: 'pw' })
			).rejects.toThrow(NotFoundException)
		})

		it('бросает NotFoundException при неверном пароле врача', async () => {
			doctorService.getByLogin.mockResolvedValue({
				id: 'd1',
				login: 'doc',
				password: 'hash',
				role: 'doctor',
				name: 'Доктор'
			})
			adminService.getByLogin.mockResolvedValue(null)
			mockedVerify.mockResolvedValue(false)

			await expect(
				service.login({ login: 'doc', password: 'wrong' })
			).rejects.toThrow(NotFoundException)
			expect(doctorService.saveRefreshToken).not.toHaveBeenCalled()
		})
	})

	describe('forceLogout', () => {
		it('для роли admin чистит токен в adminService', async () => {
			await service.forceLogout('a1', 'admin')

			expect(adminService.clearRefreshToken).toHaveBeenCalledWith('a1')
			expect(doctorService.clearRefreshToken).not.toHaveBeenCalled()
		})

		it('для роли doctor чистит токен в doctorService', async () => {
			await service.forceLogout('d1', 'doctor')

			expect(doctorService.clearRefreshToken).toHaveBeenCalledWith('d1')
			expect(adminService.clearRefreshToken).not.toHaveBeenCalled()
		})

		it('для неизвестной роли бросает UnauthorizedException', async () => {
			await expect(service.forceLogout('x', 'guest')).rejects.toThrow(
				UnauthorizedException
			)
			expect(doctorService.clearRefreshToken).not.toHaveBeenCalled()
			expect(adminService.clearRefreshToken).not.toHaveBeenCalled()
		})
	})

	describe('getNewTokens', () => {
		it('выдаёт новые токены при валидном refresh-токене', async () => {
			jwt.verifyAsync.mockResolvedValue({ id: 'd1', role: 'doctor' })
			doctorService.getById.mockResolvedValue({
				id: 'd1',
				role: 'doctor',
				refreshToken: 'rt'
			})
			jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh')

			const result = await service.getNewTokens('rt')

			expect(result.accessToken).toBe('access')
			expect(doctorService.saveRefreshToken).toHaveBeenCalledWith(
				'd1',
				'refresh'
			)
		})

		it('бросает UnauthorizedException, если сохранённый токен не совпадает', async () => {
			jwt.verifyAsync.mockResolvedValue({ id: 'd1', role: 'doctor' })
			doctorService.getById.mockResolvedValue({
				id: 'd1',
				role: 'doctor',
				refreshToken: 'другой'
			})

			await expect(service.getNewTokens('rt')).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('бросает UnauthorizedException при нераспознанной роли', async () => {
			jwt.verifyAsync.mockResolvedValue({ id: 'x', role: 'guest' })

			await expect(service.getNewTokens('rt')).rejects.toThrow(
				UnauthorizedException
			)
			expect(doctorService.getById).not.toHaveBeenCalled()
			expect(adminService.getById).not.toHaveBeenCalled()
		})
	})
})
