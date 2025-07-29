import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'UserSearchPipe', pure: false,
    standalone: false
})
export class UserSearchPipe implements PipeTransform {
  transform(value: any[], searchText?: any): any[] {
    if (!searchText || !value) {
      return value;
    }

    const regex = new RegExp(searchText, 'ig');
    return value.filter(user => {
      if (user.profile.name) {
        return user.profile.name.search(regex) !== -1;
      }
      else {
        return user.username.search(regex) !== -1;
      }
    });

  }

}