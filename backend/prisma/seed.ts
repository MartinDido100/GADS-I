import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();

// Los 10 empleados vienen del frontend/src/data/mockData.ts.
// El primero (Juan Pérez) y la primera mujer activa quedan como ADMINISTRADOR
// y CONTADOR para que haya al menos un usuario de cada rol al iniciar.
// Las passwords las setea el admin a mano (campo nullable).
const empleadosSeed = [
  { legajo: 1001, nombre: 'Juan Pérez',       dni: 30123456, cuil: '20-30123456-7', fecha_ingreso: '2019-03-15', categoria_laboral: 'A', activo: true,  rol: Rol.ADMINISTRADOR },
  { legajo: 1002, nombre: 'María González',   dni: 28456789, cuil: '27-28456789-3', fecha_ingreso: '2020-07-01', categoria_laboral: 'B', activo: true,  rol: Rol.CONTADOR      },
  { legajo: 1003, nombre: 'Carlos Rodríguez', dni: 32789012, cuil: '20-32789012-1', fecha_ingreso: '2018-11-20', categoria_laboral: 'A', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1004, nombre: 'Ana Martínez',     dni: 31234567, cuil: '27-31234567-9', fecha_ingreso: '2021-02-10', categoria_laboral: 'C', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1005, nombre: 'Luis López',       dni: 29876543, cuil: '20-29876543-5', fecha_ingreso: '2022-05-03', categoria_laboral: 'B', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1006, nombre: 'Sofía Fernández',  dni: 33456789, cuil: '27-33456789-2', fecha_ingreso: '2021-09-14', categoria_laboral: 'A', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1007, nombre: 'Diego Torres',     dni: 27654321, cuil: '20-27654321-8', fecha_ingreso: '2017-06-30', categoria_laboral: 'C', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1008, nombre: 'Valentina Díaz',   dni: 34123456, cuil: '27-34123456-4', fecha_ingreso: '2023-01-16', categoria_laboral: 'B', activo: true,  rol: Rol.EMPLEADO      },
  { legajo: 1009, nombre: 'Roberto Sánchez',  dni: 25987654, cuil: '20-25987654-6', fecha_ingreso: '2015-04-22', categoria_laboral: 'A', activo: false, rol: Rol.EMPLEADO      },
  { legajo: 1010, nombre: 'Camila Romero',    dni: 35678901, cuil: '27-35678901-0', fecha_ingreso: '2022-11-07', categoria_laboral: 'C', activo: false, rol: Rol.EMPLEADO      },
];

// Tipos de novedad enumerados en el PDF (Funcionalidad 4).
const tiposNovedad = [
  'Tardanza injustificada',
  'Ausencia injustificada',
  'Horas extra al 50%',
  'Horas extra al 100%',
  'Salida anticipada',
  'Licencia por enfermedad',
  'Licencia por examen',
  'Vacaciones parciales',
  'Suspensión disciplinaria',
  'Permiso especial',
];

// Un horario base "comercio 9 a 18" para que haya algo asignable de inicio.
const horariosSeed = [
  {
    descripcion: 'Jornada completa Lun–Vie 09:00 a 18:00',
    horario_entrada: '09:00',
    horario_retiro: '18:00',
    horas_a_trabajar: null,
    tolerancia_entrada: 5,
    tolerancia_retiro: 5,
    minutos_minimos_descanso: 60,
    umbral_horas_extras: 15,
  },
  {
    descripcion: 'Media jornada Lun–Vie 09:00 a 13:00',
    horario_entrada: '09:00',
    horario_retiro: '13:00',
    horas_a_trabajar: 240,
    tolerancia_entrada: 5,
    tolerancia_retiro: 5,
    minutos_minimos_descanso: 0,
    umbral_horas_extras: 15,
  },
];

async function main() {
  console.log('Sembrando empleados...');
  for (const e of empleadosSeed) {
    await prisma.empleado.upsert({
      where: { legajo: e.legajo },
      update: {},
      create: {
        ...e,
        fecha_ingreso: new Date(e.fecha_ingreso),
      },
    });
  }

  console.log('Sembrando tipos de novedad...');
  for (const descripcion of tiposNovedad) {
    await prisma.tipoNovedad.upsert({
      where: { descripcion },
      update: {},
      create: { descripcion },
    });
  }

  console.log('Sembrando horarios base...');
  const existentes = await prisma.horario.count();
  if (existentes === 0) {
    for (const h of horariosSeed) {
      await prisma.horario.create({ data: h });
    }
  }

  console.log('Seed completo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
