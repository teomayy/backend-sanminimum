import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as phoneUtil from 'google-libphonenumber'
import { NotificationService } from 'src/notification/notification.service'
import { PrismaService } from 'src/prisma.service'
import { CreateReportDto } from './dto/create.report.dto'

@Injectable()
export class ReportService {
	private readonly logger = new Logger(ReportService.name)
	private phoneInstance = phoneUtil.PhoneNumberUtil.getInstance()

	constructor(
		private readonly prisma: PrismaService,
		private readonly notificationService: NotificationService
	) {}

	private normalizedPhone(phone: string): string | null {
		try {
			const parsedNumber = this.phoneInstance.parseAndKeepRawInput(phone, 'UZ')
			return this.phoneInstance.format(
				parsedNumber,
				phoneUtil.PhoneNumberFormat.E164
			)
		} catch (error) {
			return null
		}
	}

	async createReport(doctorId: string, dto: CreateReportDto) {
		const normalizedPhone = this.normalizedPhone(dto.phone)
		if (!normalizedPhone) {
			throw new Error('Некорректный номер телефона.')
		}
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
				phone: normalizedPhone,
				certificateId: dto.certificateId,
				issueDate: new Date(dto.issueDate),
				expiryDate: new Date(
					new Date(dto.issueDate).setFullYear(
						new Date(dto.issueDate).getFullYear() + 1
					)
				)
			}
		})

		await this.notificationService.notifyOnReportCreation(
			report.phone,
			report.fullName
		)

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

		const phoneInstance = phoneUtil.PhoneNumberUtil.getInstance()
		let normalizedPhone: string | undefined = undefined

		if (dto.phone) {
			try {
				const parsedNumber = phoneInstance.parseAndKeepRawInput(dto.phone, 'UZ') // Укажите код страны
				normalizedPhone = phoneInstance.format(
					parsedNumber,
					phoneUtil.PhoneNumberFormat.E164
				)
			} catch (error) {
				throw new Error('Некорректный номер телефона.')
			}
		}

		const updatedReport = await this.prisma.report.update({
			where: { id },
			data: {
				...dto,
				phone: normalizedPhone || dto.phone,
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

	async getReportsByDoctor(doctorId: string, isDeleted?: boolean) {
		const reports = this.prisma.report.findMany({
			where: {
				doctorId,
				isDeleted: isDeleted !== undefined ? isDeleted : undefined
			},
			orderBy: { createdAt: 'desc' }
		})

		return reports
	}

	// Архивирование отчёта (isDeleted = true)
	async archiveReport(reportId: string) {
		const report = await this.prisma.report.update({
			where: { id: reportId },
			data: { isDeleted: true }
		})
		if (!report) throw new NotFoundException('Отчёт не найден')
		return report
	}

	// Восстановление отчёта (isDeleted = false)
	async restoreReport(reportId: string) {
		const report = await this.prisma.report.update({
			where: { id: reportId },
			data: { isDeleted: false }
		})
		if (!report) throw new NotFoundException('Отчёт не найден')
		return report
	}

	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async deleteOldArchivedReports() {
		const oneYearAgo = new Date()
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

		const deletedReports = await this.prisma.report.deleteMany({
			where: {
				isDeleted: true,
				updatedAt: { lt: oneYearAgo }
			}
		})

		this.logger.log(`Удалено ${deletedReports.count} старых архивных заявок`)
	}
}
