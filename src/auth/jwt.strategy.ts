import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { DoctorService } from 'src/doctor/doctor.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private configService: ConfigService,
		private doctorService: DoctorService
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false, // Убедитесь, что истёкшие токены не принимаются
			secretOrKey: configService.get<string>('JWT_SECRET')
		})
	}

	async validate(payload: { id: string }) {
		console.log('JWT Payload:', payload)

		if (!payload || !payload.id) {
			console.error('Ошибка: Токен не содержит ID пользователя')
			throw new UnauthorizedException('Invalid token')
		}

		const doctor = await this.doctorService.getById(payload.id)
		if (!doctor) {
			console.error('Ошибка: Доктор не найден', payload.id)
			throw new UnauthorizedException('Доктор не найден')
		}

		console.log('Доктор успешно найден:', doctor)
		return { ...doctor, role: 'doctor' } // Возвращаем пользователя, чтобы он попал в request.user
	}
}
