
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany()
    console.log('Total users:', users.length)
    users.forEach(u => {
        console.log(`- ${u.email} (Role: ${u.role}, Status: ${u.subscriptionStatus})`)
        console.log(`  Password Hash: ${u.password ? u.password.substring(0, 10) + '...' : 'NULL'}`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
