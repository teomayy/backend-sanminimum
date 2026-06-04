import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
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
			throw new BadRequestException('Некорректный номер телефона.')
		}
		const existingReport = await this.prisma.report.findUnique({
			where: { certificateId: dto.certificateId }
		})

		if (existingReport) {
			throw new ConflictException('Отчёт с таким certificateId уже существует')
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

		if (!report) throw new NotFoundException('Отчёт не найден')

		// Soft-delete: запись помечается архивной, физически не удаляется
		return this.prisma.report.update({
			where: { id },
			data: { isDeleted: true }
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
			throw new NotFoundException('Заявка не найдена!')
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
				throw new BadRequestException('Некорректный номер телефона.')
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

	async getReportsByDoctor(
		doctorId: string,
		isDeleted?: boolean,
		page?: number,
		limit?: number
	) {
		const take = limit && limit > 0 ? limit : undefined
		const skip = take && page && page > 0 ? (page - 1) * take : undefined

		return this.prisma.report.findMany({
			where: {
				doctorId,
				isDeleted: isDeleted !== undefined ? isDeleted : undefined
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take
		})
	}

	// Архивирование отчёта (isDeleted = true)
	async archiveReport(reportId: string, doctorId: string) {
		const existing = await this.prisma.report.findFirst({
			where: { id: reportId, doctorId }
		})
		if (!existing) throw new NotFoundException('Отчёт не найден')

		return this.prisma.report.update({
			where: { id: reportId },
			data: { isDeleted: true }
		})
	}

	// Восстановление отчёта (isDeleted = false)
	async restoreReport(reportId: string, doctorId: string) {
		const existing = await this.prisma.report.findFirst({
			where: { id: reportId, doctorId }
		})
		if (!existing) throw new NotFoundException('Отчёт не найден')

		return this.prisma.report.update({
			where: { id: reportId },
			data: { isDeleted: false }
		})
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
