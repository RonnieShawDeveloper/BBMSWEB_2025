import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import Swal from "sweetalert2";

@Injectable({
  providedIn: 'root'
})
export class CriminalRegistryGuard  {
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Check the member in local storage for the authJudge or authJudgeClerk property to be true
    if(localStorage.getItem('member')) {
      if(JSON.parse(localStorage.getItem('member')).authRegistrar || JSON.parse(localStorage.getItem('member')).authRegistrarClerk || JSON.parse(localStorage.getItem('member')).authAdmin) {
        console.log('Access Granted');
        return true;
      }
    }
    // Create a swal alert letting the user know that they do not have access to this page and redirect them to the home page
    Swal.fire({
      icon: 'error',
      title: 'Access Denied',
      text: 'You do not have access to this page.',
      confirmButtonText: 'Ok'
    }).then((result) => {
      return false;
    } );

    return false;
  }

}
