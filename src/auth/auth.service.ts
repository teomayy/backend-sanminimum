import {
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { verify } from 'argon2'
import { Response } from 'express'
import { AdminService } from 'src/admin/admin.service'
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
		private adminService: AdminService,
		private readonly configService: ConfigService
	) {}

	async login(dto: AuthDto) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...user } = await this.validateUser(dto)
		const tokens = this.issueTokens(user.id, user.role)

		if (user.role === 'doctor') {
			await this.doctorService.saveRefreshToken(user.id, tokens.refreshToken)
		} else if (user.role === 'admin') {
			await this.adminService.saveRefreshToken(user.id, tokens.refreshToken)
		}

		return {
			user,
			...tokens
		}
	}

	async getNewTokens(refreshToken: string) {
		const result = await this.jwt.verifyAsync(refreshToken)
		if (!result) throw new UnauthorizedException('Invalid refresh token')

		let user
		if (result.role === 'doctor') {
			user = await this.doctorService.getById(result.id)
		} else if (result.role === 'admin') {
			user = await this.adminService.getById(result.id)
		} else {
			throw new UnauthorizedException('Роль пользователя не распознана')
		}

		if (!user || user.refreshToken !== refreshToken) {
			throw new UnauthorizedException('Refresh token не валиден')
		}

		const tokens = this.issueTokens(user.id, result.role)
		if (result.role === 'admin') {
			await this.adminService.saveRefreshToken(user.id, tokens.refreshToken)
		} else if (result.role === 'doctor') {
			await this.doctorService.saveRefreshToken(user.id, tokens.refreshToken)
		}

		return { user, ...tokens }
	}

	private issueTokens(userId: string, role: string) {
		const data = { id: userId, role }

		const accessToken = this.jwt.sign(data, {
			expiresIn: '1h'
		})

		const refreshToken = this.jwt.sign(data, {
			expiresIn: '7d'
		})

		return { accessToken, refreshToken }
	}

	private async validateUser(dto: AuthDto) {
		let user = null
		let role = ''

		const doctor = await this.doctorService.getByLogin(dto.login)
		if (doctor) {
			const isValid = await verify(doctor.password, dto.password)
			if (isValid) {
				user = doctor
				role = 'doctor'
			}
		}

		if (!user) {
			const admin = await this.adminService.getByLogin(dto.login)
			if (admin) {
				const isValid = await verify(admin.password, dto.password)
				if (isValid) {
					user = admin
					role = 'admin'
				}
			}
		}
		if (!user) throw new NotFoundException('Пользователь не найден!')
		if (!role) throw new UnauthorizedException('Пароль неверный!')

		return { ...user, role }
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
			sameSite: 'lax'
		})
	}

	removeRefreshTokenResponse(res: Response) {
		const domain = this.configService.get<string>('DOMAIN')

		res.cookie(this.REFRESH_TOKEN_NAME, '', {
			httpOnly: true,
			domain: domain,
			expires: new Date(0),
			secure: true,
			sameSite: 'lax'
		})

		res.cookie('accessToken', '', {
			httpOnly: true,
			domain: domain,
			expires: new Date(0),
			secure: true,
			sameSite: 'lax'
		})
	}

	async forceLogout(userId: string) {
		await this.doctorService.clearRefreshToken(userId)
	}
}
