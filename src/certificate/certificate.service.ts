import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCanvas, loadImage } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class CertificateService {
	async generateCertificate(report: any): Promise<string> {
		const canvas = createCanvas(600, 800)
		const ctx = canvas.getContext('2d')
		const configService = new ConfigService()

		// Проверяем и создаем директорию для сертификатов
		const certificatesDir = path.resolve(__dirname, '..', 'certificates')
		if (!fs.existsSync(certificatesDir)) {
			fs.mkdirSync(certificatesDir, { recursive: true })
		}

		// Загружаем шаблон
		const templatePath = path.join(
			configService.get('TEMPLATE_PATH'),
			'../templates/certificate-template-new.jpg'
		)

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Шаблон сертификата не найден: ${templatePath}`)
		}

		const template = await loadImage(templatePath)

		// Рисуем шаблон
		ctx.drawImage(template, 0, 0, canvas.width, canvas.height)

		// Настройки текста
		ctx.font = '14px sans-serif'
		ctx.fillStyle = '#000'

		// Добавляем текст на сертификат
		ctx.fillText(` ${report.fullName}`, 250, 320)
		ctx.fillText(`${report.workplace}`, 250, 250)
		ctx.fillText(` ${report.position}`, 250, 370)
		ctx.fillText(` ${report.certificateId}`, 400, 210)
		ctx.fillText(
			`Дата выдачи: ${new Intl.DateTimeFormat('uz-UZ').format(
				new Date(report.issueDate)
			)}`,
			210,
			180
		)

		// Сохраняем сертификат
		const outputPath = path.resolve(
			certificatesDir,
			`${report.certificateId}.png`
		)
		const out = fs.createWriteStream(outputPath)
		const stream = canvas.createPNGStream()
		stream.pipe(out)

		// Завершаем процесс сохранения
		return new Promise((resolve, reject) => {
			out.on('finish', () => resolve(outputPath))
			out.on('error', err =>
				reject(new Error(`Ошибка сохранения файла: ${err}`))
			)
		})
	}
}
