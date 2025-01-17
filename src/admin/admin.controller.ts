import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from 'src/auth/decorators/doctor.decorators'
import { CreateDoctorDto } from 'src/doctor/dto/create-doctor.dto'
import { UpdateDoctorDto } from 'src/doctor/dto/update-doctor.dto'
import { AdminService } from './admin.service'

@Controller('admin')
@Auth()
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Post('doctor')
	@UsePipes(new ValidationPipe())
	async createDoctor(@Body() dto: CreateDoctorDto) {
		return this.adminService.createDoctor(dto)
	}

	@UsePipes(new ValidationPipe())
	@HttpCode(200)
	@Put()
	@Auth()
	async updateProfile(
		@CurrentUser('id') id: string,
		@Body() dto: UpdateDoctorDto
	) {
		return this.adminService.updateDoctor(id, dto)
	}

	@Auth()
	@Get()
	async profile(@CurrentUser('id') id: string) {
		return this.adminService.getProfile(id)
	}

	@Get('doctors')
	async getDoctors() {
		return this.adminService.getAllDoctors()
	}

	@Delete('doctor/:id')
	async deleteDoctor(@Param('id') id: string) {
		return this.adminService.deleteDoctor(id)
	}
	// --- Мониторинг отчетов ---

	@Get('reports')
	async getReports(
		@Query('doctorId') doctorId?: string,
		@Query('status') status?: string,
		@Query('sortBy') sortBy?: string,
		@Query('order') order: 'asc' | 'decs' = 'asc'
	) {
		return this.adminService.getReports({ doctorId, status, sortBy, order })
	}

	@Get('report/:id')
	async getReportDetails(@Param('id') id: string) {
		return this.adminService.getReportDetails(id)
	}

	@Delete('report/:id')
	async deleteReport(@Param('id') id: string) {
		return this.adminService.deleteReport(id)
	}
}
