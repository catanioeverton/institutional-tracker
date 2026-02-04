const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.upsert({
        where: { username: 'Everton' },
        update: {},
        create: {
            username: 'everton',
            password: '#Carinho123', // Altere depois!
            perm_monitor: true,
            perm_aovivo: true,
            perm_planilha: true,
            perm_terminal: true,
            perm_admin: true,
        },
    });
    console.log('✅ Usuário Everton criado com sucesso!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());