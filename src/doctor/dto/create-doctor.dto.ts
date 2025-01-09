import { IsNotEmpty, IsString } from 'class-validator'
import { AuthDto } from 'src/auth/dto/auth.dto'

export class CreateDoctorDto extends AuthDto {
	@IsString()
	@IsNotEmpty()
	name: string
}
