import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { verify } from 'argon2'
import { Response } from 'express'
import { DoctorService } from 'src/doctor/doctor.service'
import { AuthDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
	EXPIRE_DAY_REFRESH_TOKEN = 1
	REFRESH_TOKEN_NAME = 'refreshToken'

	private readonly logger = new Logger(AuthService.name)

	constructor(
		private jwt: JwtService,
		private doctorService: DoctorService,
		private readonly configService: ConfigService
	) {}

	async login(dto: AuthDto) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.validateUser(dto)
		const tokens = this.issueTokens(user.id)

		await this.doctorService.saveRefreshToken(user.id, tokens.refreshToken)

		return {
			user,
			...tokens
		}
	}

	async register(dto: AuthDto) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const oldUser = await this.doctorService.getByLogin(dto.login)

		if (oldUser)
			throw new BadRequestException('Пользователь с таким логином существует')

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.doctorService.create(dto)

		const tokens = this.issueTokens(user.id)

		return {
			user,
			...tokens
		}
	}

	async getNewTokens(refreshToken: string) {
		const result = await this.jwt.verifyAsync(refreshToken)
		if (!result) throw new UnauthorizedException('Invalid refresh token')

		const doctor = await this.doctorService.getById(result.id)
		if (!doctor || doctor.refreshToken !== refreshToken) {
			throw new UnauthorizedException('Refresh token не валиден')
		}

		const tokens = this.issueTokens(doctor.id)
		await this.doctorService.saveRefreshToken(doctor.id, tokens.refreshToken)

		return { user: doctor, ...tokens }
	}

	private issueTokens(userId: string) {
		const data = { id: userId }

		const accessToken = this.jwt.sign(data, {
			expiresIn: '1h'
		})

		const refreshToken = this.jwt.sign(data, {
			expiresIn: '7d'
		})

		return { accessToken, refreshToken }
	}

	private async validateUser(dto: AuthDto) {
		const user = await this.doctorService.getByLogin(dto.login)

		if (!user) throw new NotFoundException('Пользователь не найден!')

		const isValid = await verify(user.password, dto.password)

		if (!isValid) throw new UnauthorizedException('Пароль не валидный!')

		return user
	}

	addRefreshTokenToResponse(res: Response, refreshToken: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

		const domain = this.configService.get<string>('DOMAIN')
		res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
			httpOnly: true,
			domain: domain,
			expires: expiresIn,
			secure: true,
			// lax if production
			sameSite: 'none'
		})
	}

	removeRefreshTokenResponse(res: Response) {
		const domain = this.configService.get<string>('DOMAIN')

		res.cookie(this.REFRESH_TOKEN_NAME, '', {
			httpOnly: true,
			domain: domain,
			expires: new Date(0),
			secure: true,
			sameSite: 'none'
		})
	}

	async forceLogout(userId: string) {
		await this.doctorService.clearRefreshToken(userId)
	}
}
