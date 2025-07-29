import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ChatPersonSearchPipe',
    standalone: false
})
export class ChatPersonSearchPipe implements PipeTransform {
  transform(value: any[], args?: string): any[] {
    if (!value || !args) {
      return value;
    }
    const searchText = new RegExp(args, 'ig');
    return value.filter(message => {
      return (message.author && message.author.search(searchText) !== -1)
    });
  }
}
