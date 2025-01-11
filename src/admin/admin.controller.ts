import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CreateDoctorDto } from 'src/doctor/dto/create-doctor.dto'
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

	@Get('doctors')
	async getDoctors() {
		return this.adminService.getAllDoctors()
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

	@Delete('reports/:id')
	async deleteReport(@Param('id') id: string) {
		return this.adminService.deleteReport(id)
	}
}
