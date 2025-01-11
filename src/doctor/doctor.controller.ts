import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Put,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
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
		console.log('ID current doctor:', id)
		return this.doctorService.getProfile(id)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Put()
	@Auth()
	async updateProfile(
		@CurrentUser('id') id: string,
		@Body() dto: UpdateDoctorDto
	) {
		return this.doctorService.update(id, dto)
	}

	@Auth()
	@Post()
	async createDoctor(@Body() dto: AuthDto) {
		return this.doctorService.create(dto)
	}
}
