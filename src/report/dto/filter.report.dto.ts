import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class FilterReportDto {
	@IsOptional()
	@IsString()
	fullName?: string

	@IsOptional()
	@IsBoolean()
	isDeleted?: boolean

	@IsOptional()
	@IsString()
	startDate?: string

	@IsOptional()
	@IsString()
	endDate?: string
}
