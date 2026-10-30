import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CotizarDto } from './cotizar.dto.js';

export class CrearReservaDto extends CotizarDto {
  @IsString()
  @Length(3, 100, { message: 'nombre debe tener entre 3 y 100 caracteres' })
  nombre: string;

  @IsEmail({}, { message: 'email no es válido' })
  email: string;

  @Matches(/^\+?[\d\s-]{7,20}$/, { message: 'telefono no es válido' })
  telefono: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notas?: string;
}
