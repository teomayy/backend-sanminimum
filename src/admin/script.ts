import { PrismaClient } from '@prisma/client'
import { hash } from 'argon2'

const prisma = new PrismaClient()

async function main() {
	const login = process.env.ADMIN_LOGIN
	const password = process.env.ADMIN_PASSWORD
	const name = process.env.ADMIN_NAME ?? 'Super Admin'

	if (!login || !password) {
		throw new Error(
			'Не заданы ADMIN_LOGIN и/или ADMIN_PASSWORD. ' +
				'Запуск: ADMIN_LOGIN=... ADMIN_PASSWORD=... npx ts-node src/admin/script.ts'
		)
	}

	const adminExists = await prisma.admin.findFirst()
	if (adminExists) {
		console.log('Администратор уже существует')
		return
	}

	await prisma.admin.create({
		data: {
			name,
			login,
			password: await hash(password)
		}
	})
	console.log(`Администратор создан с логином "${login}"`)
}

main()
	.catch(e => console.error(e))
	.finally(() => prisma.$disconnect())
