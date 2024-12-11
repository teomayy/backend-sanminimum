import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { CreateDoctorDto } from './create-doctor.dto'

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
	@IsString()
	@IsOptional()
	login?: string

	@IsString()
	@IsOptional()
	name?: string

	@IsOptional()
	@MinLength(6, {
		message: 'Пароль должен быть не менее 6 символов'
	})
	@IsString()
	password?: string
}
