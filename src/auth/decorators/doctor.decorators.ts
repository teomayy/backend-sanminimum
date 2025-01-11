import {
	ExecutionContext,
	UnauthorizedException,
	createParamDecorator
} from '@nestjs/common'
import { RequestWithUser } from '../types/request.with.user'

export const CurrentUser = createParamDecorator(
	(data: string | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest<RequestWithUser>()
		const user = request.user

		if (!user) {
			console.error('Request does not have user attached:', request)
			throw new UnauthorizedException('Пользователь не авторизована')
		}

		return data ? (user?.[data] ?? null) : user
	}
)
