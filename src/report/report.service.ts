import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { NotificationService } from 'src/notification/notification.service'
import { PrismaService } from 'src/prisma.service'
import { CreateReportDto } from './dto/create.report.dto'
import { FilterReportDto } from './dto/filter.report.dto'

@Injectable()
export class ReportService {
	private readonly logger = new Logger(ReportService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly notificationService: NotificationService
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async checkCertificateExpired() {
		this.logger.log('Checking for expiring and expired certificates...')

		const expiringSoonReports = await this.prisma.report.findMany({
			where: {
				expiryDate: {
					gte: new Date(),
					lte: new Date(new Date().setDate(new Date().getDate() + 7))
				}
			}
		})

		for (const report of expiringSoonReports) {
			await this.notificationService.sendSms(
				report.phone,
				`Ваш санмимум с номером ${report.certificateId} истекает через 7 дней.Пожалуйста, продлите его.`
			)
		}

		const expiredReports = await this.prisma.report.findMany({
			where: {
				expiryDate: {
					lt: new Date()
				}
			}
		})

		for (const report of expiredReports) {
			await this.notificationService.sendSms(
				report.phone,
				`Ваш санмимум с номером ${report.certificateId} истёк. Пожалуйста, обновите его.`
			)
		}
	}

	async createReport(doctorId: string, dto: CreateReportDto) {
		const existingReport = await this.prisma.report.findUnique({
			where: { certificateId: dto.certificateId }
		})

		if (existingReport) {
			throw new Error('Отчёт с таким certificateId уже существует')
		}

		const report = await this.prisma.report.create({
			data: {
				doctorId,
				fullName: dto.fullName,
				birthDate: new Date(dto.birthDate),
				workplace: dto.workplace,
				position: dto.position,
				phone: dto.phone,
				certificateId: dto.certificateId,
				issueDate: new Date(dto.issueDate),
				expiryDate: new Date(
					new Date(dto.issueDate).setFullYear(
						new Date(dto.issueDate).getFullYear() + 1
					)
				)
			}
		})

		return report
	}

	async deleteReport(id: string, doctorId: string) {
		const report = await this.prisma.report.findFirst({
			where: { id, doctorId }
		})

		if (!report) throw new Error('Report not found')

		return this.prisma.report.delete({
			where: { id }
		})
	}

	async updateReport(
		id: string,
		doctorId: string,
		dto: Partial<CreateReportDto>
	) {
		const report = await this.prisma.report.findFirst({
			where: { id, doctorId }
		})
		if (!report) {
			throw new Error('Заявка не найден!')
		}

		const updatedReport = await this.prisma.report.update({
			where: { id },
			data: {
				...dto,
				birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
				issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
				expiryDate: dto.issueDate
					? new Date(
							new Date(dto.issueDate).setFullYear(
								new Date(dto.issueDate).getFullYear() + 1
							)
						)
					: undefined
			}
		})

		return updatedReport
	}

	async getReportsByDoctor(doctorId: string, filters?: FilterReportDto) {
		const { fullName, isDeleted, startDate, endDate } = filters || {}

		return this.prisma.report.findMany({
			where: {
				doctorId,
				fullName: fullName ? { contains: fullName } : undefined,
				isDeleted,
				createdAt: {
					gte: startDate ? new Date(startDate) : undefined,
					lte: endDate ? new Date(endDate) : undefined
				}
			}
		})
	}
}
