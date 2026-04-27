export type Rol = 'EMPLEADO' | 'ADMINISTRADOR' | 'CONTADOR';

export interface Empleado {
  legajo: number;
  nombre: string;
  dni: number;
  cuil: string;
  fecha_ingreso: string; // ISO
  categoria_laboral: string;
  activo: boolean;
  rol: Rol;
}

export interface AuthUser {
  legajo: number;
  nombre: string;
  rol: Rol;
}

export interface LoginResponse {
  token: string;
  empleado: AuthUser;
}

