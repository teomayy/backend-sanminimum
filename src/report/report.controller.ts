import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
	Put,
	Query,
	UseGuards
} from '@nestjs/common'
import { CurrentUser } from 'src/auth/decorators/doctor.decorators'
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
		@CurrentUser('id') doctorId: string,
		@Body() dto: CreateReportDto
	) {
		return this.reportService.createReport(doctorId, dto)
	}

	@Put(':id')
	async updateReport(
		@Param('id') id: string,
		@CurrentUser('id') doctorId: string,
		@Body() dto: UpdateReportDto
	) {
		return this.reportService.updateReport(id, doctorId, dto)
	}

	@Delete(':id')
	async deleteReport(
		@Param('id') id: string,
		@CurrentUser('id') doctorId: string
	) {
		return this.reportService.deleteReport(id, doctorId)
	}

	@Get()
	getReports(
		@CurrentUser('id') doctorId: string,
		@Query() filters: FilterReportDto
	) {
		const isDeleted = filters.isDeleted
			? JSON.parse(filters.isDeleted.toString())
			: undefined

		return this.reportService.getReportsByDoctor(doctorId, isDeleted)
	}

	// Архивирование отчёта
	@Patch(':id/archive')
	async archiveReport(@Param('id') reportId: string) {
		const updatedReport = await this.reportService.archiveReport(reportId)
		if (!updatedReport) throw new NotFoundException('Отчёт не найден')
		return { message: 'Отчёт перемещён в архив' }
	}

	// Восстановление отчёта
	@Patch(':id/restore')
	async restoreReport(@Param('id') reportId: string) {
		const updatedReport = await this.reportService.restoreReport(reportId)
		if (!updatedReport) throw new NotFoundException('Отчёт не найден')
		return { message: 'Отчёт восстановлен' }
	}
}
