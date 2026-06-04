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
			throw new UnauthorizedException('Пользователь не авторизован')
		}

		return data ? ((user as Record<string, any>)?.[data] ?? null) : user
	}
)
