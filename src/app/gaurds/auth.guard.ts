import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from "../services/auth.service";
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    console.log('AuthGuard#canActivate called');
    return this.authService.isLoggedIn().pipe(
      map(loggedIn => {
        if (!loggedIn) {
          this.router.navigateByUrl('/login');
          return false;
        }

        const lastLoginString = localStorage.getItem('lastLogin'); // Retrieve last login time from localStorage
        console.log('lastLoginString:', lastLoginString);
        if (lastLoginString) {
          const lastLoginTime = new Date(lastLoginString).getTime();
          const currentTime = new Date().getTime();

          // Check if more than 12 hours have passed since the last login
          const hoursSinceLastLogin = (currentTime - lastLoginTime) / (1000 * 60 * 60);
          console.log('hoursSinceLastLogin:', hoursSinceLastLogin);
          if (hoursSinceLastLogin > 12) {
            Swal.fire({
              title: 'Session Expired',
              text: 'Your session has expired. Please log in again.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            this.authService.logout(); // Log the user out
            this.router.navigateByUrl('/login'); // Redirect to the login page
            return false;
          }
        }

        return true;
      })
    );
  }
}
