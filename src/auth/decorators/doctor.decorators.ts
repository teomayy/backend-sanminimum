import {
	ExecutionContext,
	UnauthorizedException,
	createParamDecorator
} from '@nestjs/common'
import { Doctor } from '@prisma/client'

export const CurrentDoctor = createParamDecorator(
	(data: keyof Doctor, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		const doctor = request.user

		if (!doctor) {
			throw new UnauthorizedException('Пользователь не авторизована')
		}

		return data ? doctor[data] : doctor
	}
)
