import { Injectable } from '@nestjs/common'
import { createCanvas, loadImage } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class CertificateService {
	async generateCertificate(report: any): Promise<string> {
		const canvas = createCanvas(800, 600)
		const ctx = canvas.getContext('2d')

		// Загрузка шаблона
		const templatePath = path.resolve(
			__dirname,
			'templates',
			'certificate-template.jpg'
		)
		const template = await loadImage(templatePath)

		// Рисуем шаблон
		ctx.drawImage(template, 0, 0, canvas.width, canvas.height)

		// Добавляем текст
		ctx.font = '28px Arial'
		ctx.fillStyle = '#000'
		ctx.fillText(`ФИО: ${report.fullName}`, 100, 200)
		ctx.fillText(`Место работы: ${report.workplace}`, 100, 250)
		ctx.fillText(`Должность: ${report.position}`, 100, 300)
		ctx.fillText(`Номер сертификата: ${report.certificateId}`, 100, 350)
		ctx.fillText(
			`Дата выдачи: ${new Date(report.issueDate).toLocaleDateString()}`,
			100,
			400
		)

		// Сохранение файла
		const outputPath = path.resolve(
			__dirname,
			'..',
			'certificates',
			`${report.certificateId}.png`
		)
		const out = fs.createWriteStream(outputPath)
		const stream = canvas.createPNGStream()
		stream.pipe(out)

		return new Promise((resolve, reject) => {
			out.on('finish', () => resolve(outputPath))
			out.on('error', err => reject(err))
		})
	}
}
