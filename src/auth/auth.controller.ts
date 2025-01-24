import {
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { AuthDto } from './dto/auth.dto'
import { JwtAuthGuard } from './guards/jwt.guard'
import { RequestWithUser } from './types/request.with.user'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private jwtService: JwtService
	) {}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Post('login')
	async login(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
		const { refreshToken, ...response } = await this.authService.login(dto)
		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@Post('verify-role')
	@UseGuards(JwtAuthGuard)
	verifyRole(@Req() req: any) {
		try {
			const user = req.user
			console.log('TOK', user.role)

			return { role: user.role }
		} catch (error) {
			return { role: null }
		}
	}

	@HttpCode(200)
	@Post('login/access-token')
	async getNewTokens(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const refreshTokenFromCookies =
			req.cookies[this.authService.REFRESH_TOKEN_NAME]

		if (!refreshTokenFromCookies) {
			this.authService.removeRefreshTokenResponse(res)
			throw new UnauthorizedException('Refresh token not passed')
		}

		const { refreshToken, ...response } = await this.authService.getNewTokens(
			refreshTokenFromCookies
		)

		this.authService.addRefreshTokenToResponse(res, refreshToken)

		return response
	}

	@HttpCode(200)
	@Post('logout')
	async logout(@Res({ passthrough: true }) res: Response) {
		this.authService.removeRefreshTokenResponse(res)
		return true
	}

	@HttpCode(200)
	@Post('force-logout')
	async forceLogout(@Req() req: RequestWithUser) {
		const user = req.user

		if (!user) throw new UnauthorizedException('Пользователь не авторизован')

		await this.authService.forceLogout(user.id)

		return { message: 'Все активные сеансы завершены' }
	}
}
