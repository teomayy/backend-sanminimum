import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'

describe('RolesGuard', () => {
	let guard: RolesGuard
	let reflector: { getAllAndOverride: jest.Mock }

	const createContext = (user: unknown): ExecutionContext =>
		({
			getHandler: () => null,
			getClass: () => null,
			switchToHttp: () => ({
				getRequest: () => ({ user })
			})
		}) as unknown as ExecutionContext

	beforeEach(() => {
		reflector = { getAllAndOverride: jest.fn() }
		guard = new RolesGuard(reflector as unknown as Reflector)
	})

	it('пропускает, когда роли не заданы (undefined)', () => {
		reflector.getAllAndOverride.mockReturnValue(undefined)
		expect(guard.canActivate(createContext({ role: 'doctor' }))).toBe(true)
	})

	it('пропускает, когда список ролей пуст', () => {
		reflector.getAllAndOverride.mockReturnValue([])
		expect(guard.canActivate(createContext({ role: 'doctor' }))).toBe(true)
	})

	it('пропускает, когда роль пользователя совпадает с требуемой', () => {
		reflector.getAllAndOverride.mockReturnValue(['admin'])
		expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true)
	})

	it('запрещает, когда роль пользователя не совпадает', () => {
		reflector.getAllAndOverride.mockReturnValue(['admin'])
		expect(() => guard.canActivate(createContext({ role: 'doctor' }))).toThrow(
			ForbiddenException
		)
	})

	it('запрещает, когда пользователь не прикреплён к запросу', () => {
		reflector.getAllAndOverride.mockReturnValue(['admin'])
		expect(() => guard.canActivate(createContext(undefined))).toThrow(
			ForbiddenException
		)
	})
})
