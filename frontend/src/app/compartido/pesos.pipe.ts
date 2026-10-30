import { Pipe, PipeTransform } from '@angular/core';
import { formatearPesos } from './formato';

/** En plantillas: {{ 320000 | pesos }} → "$ 320.000" */
@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor == null ? '' : formatearPesos(valor);
  }
}
