import { Injectable } from '@nestjs/common'
import * as fontkit from '@pdf-lib/fontkit'
import * as fs from 'fs'
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'
import * as path from 'path'
import { QrService } from './qr.service'

interface CertificateData {
	certificateId: string
	fullName: string
	workplace: string
	position: string
	issueDate: Date
	expiryDate: Date
}

@Injectable()
export class CertificatePdfService {
	constructor(private readonly qrService: QrService) {}

	// Шрифт рядом со скомпилированным файлом (dist), с fallback на src
	private resolveFontPath(): string {
		const distPath = path.join(__dirname, 'fonts', 'DejaVuSans.ttf')
		if (fs.existsSync(distPath)) return distPath
		return path.resolve(
			process.cwd(),
			'src/certificate/fonts/DejaVuSans.ttf'
		)
	}

	/** PDF-сертификат с данными и QR-кодом на страницу публичной проверки. */
	async generate(report: CertificateData): Promise<Buffer> {
		const pdf = await PDFDocument.create()
		pdf.registerFontkit(fontkit)

		const font = await pdf.embedFont(fs.readFileSync(this.resolveFontPath()), {
			subset: true
		})
		const page = pdf.addPage([595, 842]) // A4

		page.drawText('Сертификат санитарного минимума', {
			x: 60,
			y: 770,
			size: 18,
			font,
			color: rgb(0.1, 0.1, 0.1)
		})

		const rows: [string, string][] = [
			['Номер', report.certificateId],
			['ФИО', report.fullName],
			['Место работы', report.workplace],
			['Должность', report.position],
			['Дата выдачи', this.formatDate(report.issueDate)],
			['Действителен до', this.formatDate(report.expiryDate)]
		]

		let y = 710
		for (const [label, value] of rows) {
			this.drawRow(page, font, label, value, y)
			y -= 32
		}

		const qrPng = await this.qrService.generateQr(report.certificateId)
		const qr = await pdf.embedPng(qrPng)
		page.drawImage(qr, { x: 410, y: 600, width: 130, height: 130 })
		page.drawText('Проверка подлинности', {
			x: 410,
			y: 588,
			size: 9,
			font,
			color: rgb(0.3, 0.3, 0.3)
		})

		const bytes = await pdf.save()
		return Buffer.from(bytes)
	}

	private drawRow(
		page: PDFPage,
		font: PDFFont,
		label: string,
		value: string,
		y: number
	): void {
		page.drawText(`${label}:`, {
			x: 60,
			y,
			size: 11,
			font,
			color: rgb(0.4, 0.4, 0.4)
		})
		page.drawText(value, { x: 200, y, size: 12, font, color: rgb(0, 0, 0) })
	}

	private formatDate(date: Date): string {
		return new Intl.DateTimeFormat('ru-RU').format(new Date(date))
	}
}
