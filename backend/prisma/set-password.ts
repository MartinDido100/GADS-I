/**
 * Setea password_hash en empleados que no la tienen.
 * Uso: npx tsx prisma/set-password.ts <legajo> <password>
 * Si no se pasan args, setea "admin123" para el legajo 1001.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const legajo = Number(process.argv[2] ?? 1001);
  const password = process.argv[3] ?? 'admin123';

  const emp = await prisma.empleado.findUnique({ where: { legajo } });
  if (!emp) {
    console.error(`Empleado ${legajo} no encontrado`);
    process.exit(1);
  }

  if (emp.password_hash) {
    console.log(`Empleado #${legajo} (${emp.nombre}) ya tiene password — no se modifica.`);
    console.log('Para forzar el cambio usá: npx tsx prisma/set-password.ts <legajo> <nueva_password> --force');
    const force = process.argv.includes('--force');
    if (!force) return;
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.empleado.update({ where: { legajo }, data: { password_hash: hash } });
  console.log(`Password seteada para #${legajo} (${emp.nombre}).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
