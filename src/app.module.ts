import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import * as LocalSession from 'telegraf-session-local'
import { AdminModule } from './admin/admin.module'
import { AppService } from './app.service'
import { AppUpdate } from './app.update'
import { AuthModule } from './auth/auth.module'
import { DoctorModule } from './doctor/doctor.module'

import { ScheduleModule } from '@nestjs/schedule'
import { ServeStaticModule } from '@nestjs/serve-static'
import * as path from 'path'
import { CertificateService } from './certificate/certificate.service'
import { NotificationModule } from './notification/notification.module'
import { ReportModule } from './report/report.module'

const sessions = new LocalSession({ database: 'session_db.json' })

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ServeStaticModule.forRoot({
			rootPath: path.resolve(__dirname, '..', '/src/templates'),
			serveRoot: '/templates'
		}),
		ConfigModule.forRoot({
			isGlobal: true
		}),
		AuthModule,
		DoctorModule,
		ReportModule,
		NotificationModule,
		AdminModule,
		TelegrafModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				middlewares: [sessions.middleware()],
				token: configService.get<string>('TELEGRAM_BOT_TOKEN')
			}),
			inject: [ConfigService]
		})
	],
	providers: [AppService, AppUpdate, CertificateService]
})
export class AppModule {}
