import type { Empleado, CierreMensual, ResumenEmpleadoPeriodo } from '../types';

export const empleados: Empleado[] = [
  { legajo: 1001, nombre: 'Juan Pérez',       dni: 30123456, cuil: '20-30123456-7', fecha_ingreso: '2019-03-15', categoria_laboral: 'A', activo: true },
  { legajo: 1002, nombre: 'María González',   dni: 28456789, cuil: '27-28456789-3', fecha_ingreso: '2020-07-01', categoria_laboral: 'B', activo: true },
  { legajo: 1003, nombre: 'Carlos Rodríguez', dni: 32789012, cuil: '20-32789012-1', fecha_ingreso: '2018-11-20', categoria_laboral: 'A', activo: true },
  { legajo: 1004, nombre: 'Ana Martínez',     dni: 31234567, cuil: '27-31234567-9', fecha_ingreso: '2021-02-10', categoria_laboral: 'C', activo: true },
  { legajo: 1005, nombre: 'Luis López',       dni: 29876543, cuil: '20-29876543-5', fecha_ingreso: '2022-05-03', categoria_laboral: 'B', activo: true },
  { legajo: 1006, nombre: 'Sofía Fernández',  dni: 33456789, cuil: '27-33456789-2', fecha_ingreso: '2021-09-14', categoria_laboral: 'A', activo: true },
  { legajo: 1007, nombre: 'Diego Torres',     dni: 27654321, cuil: '20-27654321-8', fecha_ingreso: '2017-06-30', categoria_laboral: 'C', activo: true },
  { legajo: 1008, nombre: 'Valentina Díaz',   dni: 34123456, cuil: '27-34123456-4', fecha_ingreso: '2023-01-16', categoria_laboral: 'B', activo: true },
  { legajo: 1009, nombre: 'Roberto Sánchez',  dni: 25987654, cuil: '20-25987654-6', fecha_ingreso: '2015-04-22', categoria_laboral: 'A', activo: false },
  { legajo: 1010, nombre: 'Camila Romero',    dni: 35678901, cuil: '27-35678901-0', fecha_ingreso: '2022-11-07', categoria_laboral: 'C', activo: false },
];

export const cierresMensuales: CierreMensual[] = [
  { id: 1, periodo: '2026-01-01', fecha_cierre: '2026-02-03', estado: 'C', ruta_archivo_exportado: '/exports/enero_2026.csv' },
  { id: 2, periodo: '2026-02-01', fecha_cierre: '2026-03-04', estado: 'C', ruta_archivo_exportado: '/exports/febrero_2026.csv' },
  { id: 3, periodo: '2026-03-01', fecha_cierre: '2026-04-02', estado: 'C', ruta_archivo_exportado: '/exports/marzo_2026.csv' },
  { id: 4, periodo: '2026-04-01', fecha_cierre: null,         estado: 'B', ruta_archivo_exportado: null },
];

export const defaultResumen: ResumenEmpleadoPeriodo = {
  diasTrabajados: 0,
  tardanzas: [],
  ausencias: [],
  horasExtra50: 0,
};

// Días hábiles de abril 2026: 1,2,3 | 6,7,8,9,10 | 13,14,15,16,17 (hasta el 18/04 sábado)
export const resumenCierre: Record<string, Record<number, ResumenEmpleadoPeriodo>> = {
  '2026-01-01': {
    1001: { diasTrabajados: 21, tardanzas: [{ fecha: '2026-01-08', minutos: 12 }], ausencias: [], horasExtra50: 3 },
    1002: { diasTrabajados: 20, tardanzas: [], ausencias: ['2026-01-20'], horasExtra50: 0 },
    1003: { diasTrabajados: 22, tardanzas: [], ausencias: [], horasExtra50: 5 },
    1004: { diasTrabajados: 18, tardanzas: [{ fecha: '2026-01-14', minutos: 35 }], ausencias: ['2026-01-22', '2026-01-27', '2026-01-28'], horasExtra50: 0 },
    1005: { diasTrabajados: 21, tardanzas: [{ fecha: '2026-01-09', minutos: 8 }], ausencias: [], horasExtra50: 2 },
    1006: { diasTrabajados: 22, tardanzas: [], ausencias: [], horasExtra50: 7 },
    1007: { diasTrabajados: 20, tardanzas: [{ fecha: '2026-01-16', minutos: 20 }], ausencias: ['2026-01-29'], horasExtra50: 0 },
    1008: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 1 },
  },
  '2026-02-01': {
    1001: { diasTrabajados: 19, tardanzas: [], ausencias: ['2026-02-11'], horasExtra50: 2 },
    1002: { diasTrabajados: 20, tardanzas: [{ fecha: '2026-02-05', minutos: 15 }], ausencias: [], horasExtra50: 0 },
    1003: { diasTrabajados: 20, tardanzas: [], ausencias: [], horasExtra50: 4 },
    1004: { diasTrabajados: 17, tardanzas: [], ausencias: ['2026-02-04', '2026-02-18', '2026-02-25'], horasExtra50: 0 },
    1005: { diasTrabajados: 20, tardanzas: [], ausencias: [], horasExtra50: 1 },
    1006: { diasTrabajados: 20, tardanzas: [{ fecha: '2026-02-12', minutos: 5 }], ausencias: [], horasExtra50: 6 },
    1007: { diasTrabajados: 18, tardanzas: [{ fecha: '2026-02-03', minutos: 45 }], ausencias: ['2026-02-19', '2026-02-26'], horasExtra50: 0 },
    1008: { diasTrabajados: 20, tardanzas: [], ausencias: [], horasExtra50: 0 },
  },
  '2026-03-01': {
    1001: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 4 },
    1002: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 0 },
    1003: { diasTrabajados: 21, tardanzas: [{ fecha: '2026-03-10', minutos: 10 }], ausencias: [], horasExtra50: 3 },
    1004: { diasTrabajados: 20, tardanzas: [], ausencias: ['2026-03-19'], horasExtra50: 0 },
    1005: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 2 },
    1006: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 8 },
    1007: { diasTrabajados: 19, tardanzas: [{ fecha: '2026-03-06', minutos: 18 }], ausencias: ['2026-03-24', '2026-03-31'], horasExtra50: 0 },
    1008: { diasTrabajados: 21, tardanzas: [], ausencias: [], horasExtra50: 1 },
  },
  '2026-04-01': {
    1001: { diasTrabajados: 13, tardanzas: [{ fecha: '2026-04-08', minutos: 15 }], ausencias: [], horasExtra50: 1 },
    1002: { diasTrabajados: 12, tardanzas: [{ fecha: '2026-04-02', minutos: 8 }], ausencias: ['2026-04-14'], horasExtra50: 0 },
    1003: { diasTrabajados: 13, tardanzas: [{ fecha: '2026-04-03', minutos: 22 }, { fecha: '2026-04-16', minutos: 10 }], ausencias: [], horasExtra50: 2 },
    1004: { diasTrabajados: 11, tardanzas: [], ausencias: ['2026-04-09', '2026-04-15'], horasExtra50: 0 },
    1005: { diasTrabajados: 13, tardanzas: [], ausencias: [], horasExtra50: 0 },
    1006: { diasTrabajados: 13, tardanzas: [], ausencias: [], horasExtra50: 3 },
    1007: { diasTrabajados: 10, tardanzas: [{ fecha: '2026-04-01', minutos: 12 }, { fecha: '2026-04-09', minutos: 5 }, { fecha: '2026-04-17', minutos: 18 }], ausencias: ['2026-04-07', '2026-04-14'], horasExtra50: 0 },
    1008: { diasTrabajados: 12, tardanzas: [{ fecha: '2026-04-06', minutos: 12 }], ausencias: ['2026-04-10'], horasExtra50: 0 },
  },
};
