import { Pipe, PipeTransform } from '@angular/core';
import { Mail } from '../../../services/mailbox.service';

@Pipe({
    name: 'MailSearch',
    standalone: true
})

export class MailSearchPipe implements PipeTransform {
  transform(value: Mail[] | null, args?: string): Mail[] | null {
    if (!value || !args) {
      return value;
    }
    const searchText = new RegExp(args, 'ig');
    return value.filter(mail => {
      return (mail.sender && mail.sender.search(searchText) !== -1) ||
        (mail.subject && mail.subject.search(searchText) !== -1);
    });
  }
}
