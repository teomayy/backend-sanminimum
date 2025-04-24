import { Logger } from '@nestjs/common'

export function Retryable(
	options: {
		retries?: number
		delayMs?: number
		exponential?: boolean
		retryOn?: (error: unknown) => boolean
		logLabel?: string
	} = {}
): MethodDecorator {
	return function (target, propertyKey, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value

		descriptor.value = async function (...args: unknown[]) {
			const logger = new Logger('Retryable')
			const {
				retries = 3,
				delayMs = 1000,
				exponential = true,
				logLabel = propertyKey.toString(),
				retryOn = () => true
			} = options

			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					if (attempt > 1) {
						logger.warn(`${logLabel}: Попытка ${attempt} из ${retries}`)
					}
					return await originalMethod.apply(this, args)
				} catch (error: unknown) {
					const shouldRetry = retryOn(error)

					if (error instanceof Error) {
						logger.error(
							`${logLabel}: Ошибка на попытке ${attempt}`,
							error.message
						)
					} else {
						logger.error(
							`${logLabel}: Неизвестная ошибка на попытке ${attempt}`,
							String(error)
						)
					}

					if (attempt === retries || !shouldRetry) {
						throw error
					}

					const delay =
						exponential && attempt > 1 ? delayMs * 2 ** (attempt - 1) : delayMs
					await new Promise(res => setTimeout(res, delay))
				}
			}
		}

		return descriptor
	}
}
