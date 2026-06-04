import { IsDateString, IsOptional, IsString, Matches } from 'class-validator'

export class UpdateReportDto {
	@IsOptional()
	@IsString()
	fullName?: string

	@IsOptional()
	@IsDateString()
	birthDate?: string

	@IsOptional()
	@IsString()
	workplace?: string

	@IsOptional()
	@IsString()
	position?: string

	@IsOptional()
	@IsString()
	phone?: string

	@IsOptional()
	@IsString()
	@Matches(/^[A-Za-z0-9_-]+$/, {
		message:
			'certificateId может содержать только латинские буквы, цифры, дефис и подчёркивание'
	})
	certificateId?: string

	@IsOptional()
	@IsDateString()
	issueDate?: string
}
