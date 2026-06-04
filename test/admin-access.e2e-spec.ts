import {
	CanActivate,
	ExecutionContext,
	INestApplication
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AdminController } from '../src/admin/admin.controller'
import { AdminService } from '../src/admin/admin.service'
import { JwtAuthGuard } from '../src/auth/guards/jwt.guard'

/**
 * Проверяет, что @Auth('admin') реально применяет RolesGuard сквозь
 * стек guard'ов Nest: JwtAuthGuard заменён фейком (подставляет user),
 * RolesGuard остаётся настоящим и читает метаданные ролей.
 */
describe('Контроль доступа к /admin (e2e)', () => {
	let app: INestApplication
	let currentUser: { id: string; role: string }

	beforeAll(async () => {
		const fakeJwtGuard: CanActivate = {
			canActivate: (ctx: ExecutionContext) => {
				ctx.switchToHttp().getRequest().user = currentUser
				return true
			}
		}

		const moduleRef = await Test.createTestingModule({
			controllers: [AdminController],
			providers: [
				{
					provide: AdminService,
					useValue: {
						getAllDoctors: jest.fn().mockResolvedValue([{ id: 'd1' }])
					}
				}
			]
		})
			.overrideGuard(JwtAuthGuard)
			.useValue(fakeJwtGuard)
			.compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	it('врач получает 403 на GET /admin/doctors', async () => {
		currentUser = { id: 'd1', role: 'doctor' }
		await request(app.getHttpServer()).get('/admin/doctors').expect(403)
	})

	it('админ получает 200 на GET /admin/doctors', async () => {
		currentUser = { id: 'a1', role: 'admin' }
		await request(app.getHttpServer())
			.get('/admin/doctors')
			.expect(200)
			.expect([{ id: 'd1' }])
	})
})
