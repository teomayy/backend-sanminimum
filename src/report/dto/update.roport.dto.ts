import { IsDateString, IsOptional, IsString } from 'class-validator'

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
	certificateId?: string

	@IsOptional()
	@IsDateString()
	issueDate?: string
}
