import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards
} from '@nestjs/common'
import { CurrentDoctor } from 'src/auth/decorators/doctor.decorators'
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard'
import { CreateReportDto } from './dto/create.report.dto'
import { FilterReportDto } from './dto/filter.report.dto'
import { UpdateReportDto } from './dto/update.roport.dto'
import { ReportService } from './report.service'

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
	constructor(private readonly reportService: ReportService) {}

	@Post()
	createReport(
		@CurrentDoctor('id') doctorId: string,
		@Body() dto: CreateReportDto
	) {
		console.log('Создание отчета:', { doctorId, dto })
		return this.reportService.createReport(doctorId, dto)
	}

	@Put(':id')
	async updateReport(
		@Param('id') id: string,
		@CurrentDoctor('id') doctorId: string,
		@Body() dto: UpdateReportDto
	) {
		return this.reportService.updateReport(id, doctorId, dto)
	}

	@Delete(':id')
	async deleteReport(
		@Param('id') id: string,
		@CurrentDoctor('id') doctorId: string
	) {
		console.log(`Deleting report with ID: ${id}, for doctor: ${doctorId}`)
		return this.reportService.deleteReport(id, doctorId)
	}

	@Get()
	getReports(
		@CurrentDoctor('id') doctorId: string,
		@Query() filters: FilterReportDto
	) {
		return this.reportService.getReportsByDoctor(doctorId, filters)
	}
}
