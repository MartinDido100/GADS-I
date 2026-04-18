export interface Empleado {
  legajo: number;
  nombre: string;
  dni: number;
  cuil: string;
  fecha_ingreso: string;
  categoria_laboral: string;
  activo: boolean;
}

export interface CierreMensual {
  id: number;
  periodo: string; // "YYYY-MM-01"
  fecha_cierre: string | null;
  estado: 'B' | 'C'; // B=borrador, C=cerrado
  ruta_archivo_exportado: string | null;
}

export interface TardanzaDetalle {
  fecha: string; // "YYYY-MM-DD"
  minutos: number;
}

export interface ResumenEmpleadoPeriodo {
  diasTrabajados: number;
  tardanzas: TardanzaDetalle[];
  ausencias: string[]; // array de fechas "YYYY-MM-DD"
  horasExtra50: number;
}
