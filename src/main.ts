import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const configService = app.get(ConfigService)

	app.setGlobalPrefix('api')
	app.use(cookieParser())
	// Безопасные HTTP-заголовки. CORP=cross-origin, чтобы фронтенд мог
	// загружать статические шаблоны/сертификаты с другого origin.
	app.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' }
		})
	)
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true
		})
	)

	const corsOrigins = (
		configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000'
	)
		.split(',')
		.map(origin => origin.trim())
		.filter(Boolean)

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		exposedHeaders: 'set-cookie'
	})

	// Корректное закрытие соединений (в т.ч. Prisma) при остановке процесса
	app.enableShutdownHooks()

	const port = configService.get<number>('PORT') ?? 4200
	await app.listen(port)
}
bootstrap()
