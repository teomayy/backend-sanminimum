import {
	IsDateString,
	IsNotEmpty,
	IsPhoneNumber,
	IsString,
	Matches
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
	@Matches(/^[A-Za-z0-9_-]+$/, {
		message:
			'certificateId может содержать только латинские буквы, цифры, дефис и подчёркивание'
	})
	certificateId: string

	@IsDateString()
	issueDate: string
}
