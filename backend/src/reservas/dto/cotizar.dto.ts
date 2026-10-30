import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { TipoReserva } from '../../generated/prisma/enums.js';

/**
 * Datos para cotizar (y base para crear) una reserva.
 * Los decoradores validan la FORMA de los datos; las reglas del negocio
 * (días permitidos, horarios, capacidad) se validan en cotizacion.ts.
 */
export class CotizarDto {
  @IsOptional()
  @IsString()
  alojamiento: string = 'cabana-primavera'; // slug; hoy hay una sola cabaña

  @IsEnum(TipoReserva, { message: 'tipo debe ser ESTADIA, DIA_DE_SOL u OCASIONAL' })
  tipo: TipoReserva;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaEntrada debe tener el formato AAAA-MM-DD' })
  fechaEntrada: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaSalida debe tener el formato AAAA-MM-DD' })
  fechaSalida?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'horaInicio debe tener el formato HH:mm' })
  horaInicio?: string;

  @IsInt({ message: 'huespedes debe ser un número entero' })
  @Min(1, { message: 'huespedes debe ser al menos 1' })
  @Max(20, { message: 'huespedes no puede ser mayor que 20' })
  huespedes: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  servicios: string[] = [];
}
