import { Controller, Delete, Get, Param, Query } from '@nestjs/common'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { AdminService } from './admin.service'

@Controller('admin')
@Auth()
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

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
