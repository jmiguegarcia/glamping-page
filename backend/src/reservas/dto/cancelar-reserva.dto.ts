import { IsEmail } from 'class-validator';

/** El email de la reserva funciona como verificación de que quien cancela es el cliente. */
export class CancelarReservaDto {
  @IsEmail({}, { message: 'email no es válido' })
  email: string;
}
