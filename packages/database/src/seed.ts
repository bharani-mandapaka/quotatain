import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'saran@quotatain.com'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists — skipping.`)
    return
  }

  // Password: Punto@6565 (bcrypt hash, cost 12)
  const passwordHash = '$2b$12$B.IVFR/1jtAqb3zC0TxiRe.s735zTS8rlJ012rIceLQ3pVKgdlvD2'

  const workspace = await prisma.workspace.create({
    data: { name: 'Quotatain' },
  })

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Saran',
      passwordHash,
      role: 'ADMIN',
      workspaceId: workspace.id,
    },
  })

  console.log(`Created admin user: ${user.email} (id: ${user.id})`)
  console.log(`Workspace: ${workspace.name} (id: ${workspace.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
