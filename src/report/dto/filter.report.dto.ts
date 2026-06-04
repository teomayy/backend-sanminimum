import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class FilterReportDto {
	@IsOptional()
	@IsString()
	fullName?: string

	@IsOptional()
	@Transform(({ value }) => {
		if (value === 'true' || value === true) return true
		if (value === 'false' || value === false) return false
		return value
	})
	@IsBoolean()
	isDeleted?: boolean

	@IsOptional()
	@IsString()
	startDate?: string

	@IsOptional()
	@IsString()
	endDate?: string

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number
}
