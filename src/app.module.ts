import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DoctorModule } from './doctor/doctor.module'
import { NotificationModule } from './notification/notification.module'
import { ReportModule } from './report/report.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		AuthModule,
		DoctorModule,
		ReportModule,
		NotificationModule
	]
})
export class AppModule {}
