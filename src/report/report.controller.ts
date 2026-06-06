import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	Query,
	Res,
	UseGuards
} from '@nestjs/common'
import { Response } from 'express'
import { CertificatePdfService } from 'src/certificate/certificate-pdf.service'
import { CurrentUser } from 'src/auth/decorators/doctor.decorators'
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard'
import { CreateReportDto } from './dto/create.report.dto'
import { FilterReportDto } from './dto/filter.report.dto'
import { UpdateReportDto } from './dto/update.roport.dto'
import { ReportService } from './report.service'

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
	constructor(
		private readonly reportService: ReportService,
		private readonly certificatePdfService: CertificatePdfService
	) {}

	// Скачивание PDF-сертификата своего отчёта
	@Get(':id/pdf')
	async downloadPdf(
		@Param('id') id: string,
		@CurrentUser('id') doctorId: string,
		@Res() res: Response
	) {
		const report = await this.reportService.getOwnedReport(id, doctorId)
		const pdf = await this.certificatePdfService.generate(report)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="certificate-${report.certificateId}.pdf"`
		)
		res.send(pdf)
	}

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
		return this.reportService.getReportsByDoctor(doctorId, filters)
	}

	// Архивирование отчёта
	@Patch(':id/archive')
	async archiveReport(
		@Param('id') reportId: string,
		@CurrentUser('id') doctorId: string
	) {
		await this.reportService.archiveReport(reportId, doctorId)
		return { message: 'Отчёт перемещён в архив' }
	}

	// Восстановление отчёта
	@Patch(':id/restore')
	async restoreReport(
		@Param('id') reportId: string,
		@CurrentUser('id') doctorId: string
	) {
		await this.reportService.restoreReport(reportId, doctorId)
		return { message: 'Отчёт восстановлен' }
	}
}
