import { applyDecorators, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from './roles.decorator'

export const Auth = (...roles: string[]) =>
	applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles))
