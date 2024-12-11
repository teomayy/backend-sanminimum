import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	UseGuards
} from '@nestjs/common'
import { CurrentDoctor } from 'src/auth/decorators/doctor.decorators'
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard'
import { CreateReportDto } from './dto/create.report.dto'
import { FilterReportDto } from './dto/filter.report.dto'
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
		return this.reportService.createReport(doctorId, dto)
	}

	@Delete(':id')
	deleteReport(@Param('id') id: string, @CurrentDoctor('id') doctorId: string) {
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
