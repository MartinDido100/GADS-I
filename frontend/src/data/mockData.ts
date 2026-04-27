import type { Empleado } from '../types';

export const empleados: Empleado[] = [
  { legajo: 1001, nombre: 'Juan Pérez',       dni: 30123456, cuil: '20-30123456-7', fecha_ingreso: '2019-03-15', categoria_laboral: 'A', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1002, nombre: 'María González',   dni: 28456789, cuil: '27-28456789-3', fecha_ingreso: '2020-07-01', categoria_laboral: 'B', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1003, nombre: 'Carlos Rodríguez', dni: 32789012, cuil: '20-32789012-1', fecha_ingreso: '2018-11-20', categoria_laboral: 'A', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1004, nombre: 'Ana Martínez',     dni: 31234567, cuil: '27-31234567-9', fecha_ingreso: '2021-02-10', categoria_laboral: 'C', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1005, nombre: 'Luis López',       dni: 29876543, cuil: '20-29876543-5', fecha_ingreso: '2022-05-03', categoria_laboral: 'B', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1006, nombre: 'Sofía Fernández',  dni: 33456789, cuil: '27-33456789-2', fecha_ingreso: '2021-09-14', categoria_laboral: 'A', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1007, nombre: 'Diego Torres',     dni: 27654321, cuil: '20-27654321-8', fecha_ingreso: '2017-06-30', categoria_laboral: 'C', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1008, nombre: 'Valentina Díaz',   dni: 34123456, cuil: '27-34123456-4', fecha_ingreso: '2023-01-16', categoria_laboral: 'B', activo: true,  rol: 'EMPLEADO' },
  { legajo: 1009, nombre: 'Roberto Sánchez',  dni: 25987654, cuil: '20-25987654-6', fecha_ingreso: '2015-04-22', categoria_laboral: 'A', activo: false, rol: 'EMPLEADO' },
  { legajo: 1010, nombre: 'Camila Romero',    dni: 35678901, cuil: '27-35678901-0', fecha_ingreso: '2022-11-07', categoria_laboral: 'C', activo: false, rol: 'EMPLEADO' },
];
