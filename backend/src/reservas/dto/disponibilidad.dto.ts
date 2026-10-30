import { IsOptional, IsString, Matches } from 'class-validator';

export class DisponibilidadDto {
  @IsOptional()
  @IsString()
  alojamiento: string = 'cabana-primavera';

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta: string;
}
