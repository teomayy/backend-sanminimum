import { Injectable, NotFoundException } from '@nestjs/common'
import { hash } from 'argon2'
import { AuthDto } from 'src/auth/dto/auth.dto'
import { PrismaService } from 'src/prisma.service'
import { UpdateDoctorDto } from './dto/update-doctor.dto'

@Injectable()
export class DoctorService {
	constructor(private prisma: PrismaService) {}

	async getById(id: string) {
		const doctor = await this.prisma.doctor.findUnique({
			where: {
				id
			},
			include: {
				reports: true
			}
		})

		if (!doctor) {
			throw new NotFoundException(`Doctor with ID ${id} not found`)
		}

		return doctor
	}

	getByLogin(login: string) {
		return this.prisma.doctor.findUnique({
			where: {
				login
			}
		})
	}

	async getProfile(id: string) {
		const profile = await this.getById(id)

		const [totalReports, expiredReports, expiringSoonReports] =
			await Promise.all([
				this.prisma.report.count({ where: { doctorId: id } }),
				this.prisma.report.count({
					where: { doctorId: id, expiryDate: { lte: new Date() } }
				}),
				this.prisma.report.count({
					where: {
						doctorId: id,
						expiryDate: {
							gte: new Date(),
							lte: new Date(new Date().setMonth(new Date().getMonth() + 1))
						}
					}
				})
			])

		return {
			doctor: profile,
			statistics: {
				totalReports,
				expiredReports,
				expiringSoonReports
			}
		}
	}

	async create(dto: AuthDto) {
		const existingDoctor = await this.getByLogin(dto.login)
		if (existingDoctor) throw new Error('Доктор с таким логином уже существует')

		const user = {
			login: dto.login,
			name: '',
			password: await hash(dto.password)
		}

		return this.prisma.doctor.create({
			data: user
		})
	}

	async update(id: string, dto: UpdateDoctorDto) {
		let data = dto

		if (dto.password) {
			data = { ...dto, password: await hash(dto.password) }
		}

		return this.prisma.doctor.update({
			where: {
				id
			},
			data,
			select: {
				name: true
			}
		})
	}

	async saveRefreshToken(userId: string, refreshToken: string) {
		await this.prisma.doctor.update({
			where: { id: userId },
			data: { refreshToken }
		})
	}

	async clearRefreshToken(useId: string) {
		await this.prisma.doctor.update({
			where: { id: useId },
			data: { refreshToken: null }
		})
	}
}
