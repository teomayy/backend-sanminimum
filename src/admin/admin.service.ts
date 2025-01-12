import { Injectable, NotFoundException } from '@nestjs/common'
import { hash } from 'argon2'
import { CreateDoctorDto } from 'src/doctor/dto/create-doctor.dto'
import { UpdateDoctorDto } from 'src/doctor/dto/update-doctor.dto'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class AdminService {
	constructor(private readonly prisma: PrismaService) {}

	async getById(id: string) {
		const admin = await this.prisma.admin.findUnique({ where: { id } })
		if (!admin) throw new NotFoundException('Администратор не найден')
		return admin
	}

	async getProfile(adminId: string) {
		const admin = await this.prisma.admin.findUnique({
			where: { id: adminId },
			select: {
				id: true,
				login: true,
				name: true,
				createdAt: true,
				updatedAt: true
			}
		})

		if (!admin) {
			throw new NotFoundException('Администратор не найден')
		}
		return admin
	}

	async getByLogin(login: string) {
		const admin = await this.prisma.admin.findUnique({ where: { login } })
		if (!admin)
			throw new NotFoundException('Администратор с таким логином не найден')
		return admin
	}

	async createAdmin(name: string, login: string, password: string) {
		const hashedPassword = await hash(password)
		return this.prisma.admin.create({
			data: {
				name,
				login,
				password: hashedPassword
			}
		})
	}

	async getAllDoctors() {
		return this.prisma.doctor.findMany({
			include: {
				reports: true
			}
		})
	}

	async createDoctor(dto: CreateDoctorDto) {
		const existingDoctor = await this.prisma.doctor.findUnique({
			where: { login: dto.login }
		})

		if (existingDoctor) {
			throw new Error('Доктор с таким логином уже существует')
		}

		return this.prisma.doctor.create({
			data: {
				login: dto.login,
				name: dto.name,
				password: await hash(dto.password)
			}
		})
	}

	async updateDoctor(id: string, dto: UpdateDoctorDto) {
		let data = dto

		if (dto.password) {
			data = { ...dto, password: await hash(dto.password) }
		}
		return this.prisma.admin.update({
			where: { id },
			data
		})
	}

	async deleteDoctor(id: string) {
		const doctor = await this.prisma.doctor.findUnique({ where: { id } })

		if (!doctor) {
			throw new NotFoundException('Доктор не найден')
		}

		return this.prisma.doctor.delete({ where: { id } })
	}

	// --- Мониторинг отчетов ---

	async getReports({
		doctorId,
		status,
		sortBy = 'createdAt',
		order = 'asc'
	}: {
		doctorId?: string
		status?: string
		sortBy?: string
		order?: string
	}) {
		const where: any = {}

		if (doctorId) where.doctorId = doctorId
		if (status === 'deleted') where.isDeleted = true

		return this.prisma.report.findMany({
			where,
			orderBy: {
				[sortBy]: order
			},
			include: {
				doctor: true
			}
		})
	}

	async getReportDetails(id: string) {
		const report = await this.prisma.report.findUnique({
			where: { id },
			include: {
				doctor: true
			}
		})

		if (!report) throw new NotFoundException('Справка не найдена')

		return report
	}

	async deleteReport(id: string) {
		const report = await this.prisma.report.findUnique({ where: { id } })

		if (!report) {
			throw new NotFoundException('Отчет не найден')
		}

		return this.prisma.report.delete({ where: { id } })
	}

	async saveRefreshToken(userId: string, refreshToken: string) {
		await this.prisma.admin.update({
			where: { id: userId },
			data: { refreshToken }
		})
	}

	async clearRefreshToken(useId: string) {
		await this.prisma.admin.update({
			where: { id: useId },
			data: { refreshToken: null }
		})
	}
}
