import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query
} from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from 'src/auth/decorators/doctor.decorators'
import { CreateDoctorDto } from 'src/doctor/dto/create-doctor.dto'
import { UpdateDoctorDto } from 'src/doctor/dto/update-doctor.dto'
import { AdminService } from './admin.service'

@Controller('admin')
@Auth('admin')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Post('doctor')
	async createDoctor(@Body() dto: CreateDoctorDto) {
		return this.adminService.createDoctor(dto)
	}

	@HttpCode(200)
	@Put()
	async updateProfile(
		@CurrentUser('id') id: string,
		@Body() dto: UpdateDoctorDto
	) {
		return this.adminService.updateDoctor(id, dto)
	}

	@Get()
	async profile(@CurrentUser('id') id: string) {
		return this.adminService.getProfile(id)
	}

	@Get('doctors')
	async getDoctors(
		@Query('page') page?: string,
		@Query('limit') limit?: string
	) {
		return this.adminService.getAllDoctors(
			page ? Number(page) : undefined,
			limit ? Number(limit) : undefined
		)
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
		@Query('order') order: 'asc' | 'desc' = 'asc',
		@Query('page') page?: string,
		@Query('limit') limit?: string
	) {
		return this.adminService.getReports({
			doctorId,
			status,
			sortBy,
			order,
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined
		})
	}

	@Get('report/:id')
	async getReportDetails(@Param('id') id: string) {
		return this.adminService.getReportDetails(id)
	}

	@Delete('report/:id')
	async deleteReport(@Param('id') id: string) {
		return this.adminService.deleteReport(id)
	}

	@Get('/stats')
	getStatistics() {
		return this.adminService.getStatistics()
	}
}
