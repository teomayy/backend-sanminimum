import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from 'src/auth/decorators/doctor.decorators'
import { AuthDto } from 'src/auth/dto/auth.dto'
import { DoctorService } from './doctor.service'
import { UpdateDoctorDto } from './dto/update-doctor.dto'

@Controller('doctor/profile')
export class DoctorController {
	constructor(private readonly doctorService: DoctorService) {}

	@Auth()
	@Get()
	async profile(@CurrentUser('id') id: string) {
		return this.doctorService.getProfile(id)
	}

	@HttpCode(200)
	@Put()
	@Auth()
	async updateProfile(
		@CurrentUser('id') id: string,
		@Body() dto: UpdateDoctorDto
	) {
		return this.doctorService.update(id, dto)
	}

	@Auth('admin')
	@Post()
	async createDoctor(@Body() dto: AuthDto) {
		return this.doctorService.create(dto)
	}
}
