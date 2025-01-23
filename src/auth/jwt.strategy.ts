import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { AdminService } from 'src/admin/admin.service'
import { DoctorService } from 'src/doctor/doctor.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private configService: ConfigService,
		private readonly adminService: AdminService,
		private readonly doctorService: DoctorService
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false, // Убедитесь, что истёкшие токены не принимаются
			secretOrKey: configService.get<string>('JWT_SECRET')
		})
	}

	async validate(payload: { id: string; role: string }) {
		let user = null

		if (payload.role === 'doctor') {
			user = await this.doctorService.getById(payload.id)
		} else if (payload.role === 'admin') {
			user = await this.adminService.getById(payload.id)
		}

		if (!user) {
			throw new UnauthorizedException('Invalid token')
		}

		return user
	}
}
