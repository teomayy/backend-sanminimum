import {
	IsDateString,
	IsNotEmpty,
	IsPhoneNumber,
	IsString
} from 'class-validator'

export class CreateReportDto {
	@IsString()
	@IsNotEmpty()
	fullName: string

	@IsDateString()
	birthDate: string

	@IsString()
	@IsNotEmpty()
	workplace: string

	@IsString()
	@IsNotEmpty()
	position: string

	@IsPhoneNumber()
	phone: string

	@IsString()
	@IsNotEmpty()
	certificateId: string

	@IsDateString()
	issueDate: string
}
