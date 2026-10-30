import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../utils/format-money';

/** Lets a template show money the same way as the code does: {{ listing.price | money }} gives "KES 8,500". */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined): string {
    return formatMoney(amount);
  }
}
