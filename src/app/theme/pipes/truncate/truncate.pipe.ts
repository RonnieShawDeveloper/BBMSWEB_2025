import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'truncate',
    standalone: false
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, args?: any): string {
    let limit = args > 0 ? parseInt(args) : 10;
    return value.length > limit ? value.substring(0, limit) + '...' : value;
  }
}