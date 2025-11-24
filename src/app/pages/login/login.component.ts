import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormGroup, UntypedFormControl, AbstractControl, UntypedFormBuilder, Validators} from '@angular/forms';
import {AuthService} from "../../services/auth.service";
import Swal from "sweetalert2";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
  public router: Router;
  public form:UntypedFormGroup;
  public email:AbstractControl;
  public password:AbstractControl;
  public showPassword: boolean = false;

  constructor(router:Router, fb:UntypedFormBuilder, private authService:AuthService) {
      this.router = router;
      this.form = fb.group({
          'email': ['', Validators.compose([Validators.required, emailValidator])],
          'password': ['', Validators.compose([Validators.required, Validators.minLength(6)])]
      });

      this.email = this.form.controls['email'];
      this.password = this.form.controls['password'];
  }

  public async onSubmit(values: Object): Promise<void> {
    if (!this.form.valid) {
      return;
    }

    try {
      // Show loading modal
      Swal.fire({
        title: 'Logging In',
        text: 'Please wait...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });

      await this.authService.login(this.email.value, this.password.value);
      // On success, the service will handle navigation; no further action needed here
    } catch (error: any) {
      const message = this.mapFirebaseAuthError(error?.code, error?.message);
      await Swal.fire({
        icon: 'error',
        title: 'Login Error',
        text: message,
        confirmButtonText: 'OK'
      });
    } finally {
      // Ensure the loading dialog is closed in all cases
      Swal.close();
    }
  }

  ngOnInit() {
      // Initialize any animations or additional functionality here
  }

  ngAfterViewInit(){
      document.getElementById('preloader').classList.add('hide');
  }

  /**
   * Toggles the visibility of the password field
   */
  togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
  }

  private mapFirebaseAuthError(code?: string, fallback?: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'The email address format is invalid. Please check and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact the administrator for assistance.';
      case 'auth/user-not-found':
        return 'No account was found with that email address. Please check the spelling or register for an account.';
      case 'auth/wrong-password':
        return 'The password you entered is incorrect. Please try again or reset your password.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Please wait a few minutes and try again.';
      case 'auth/network-request-failed':
        return 'A network error occurred. Please check your internet connection and try again.';
      case 'auth/invalid-credential':
        return 'The supplied credentials are invalid or have expired. Please sign in again.';
      case 'auth/operation-not-allowed':
        return 'Password sign-in is currently disabled for this project. Please contact support.';
      case 'auth/weak-password':
        return 'Your password is too weak. Please use at least 6 characters and try again.';
      case 'auth/requires-recent-login':
        return 'For security reasons, please sign in again to complete this action.';
      case 'auth/popup-closed-by-user':
        return 'The sign-in popup was closed before completing the sign in. Please try again.';
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser. Please allow popups and try again.';
      case 'auth/credential-already-in-use':
        return 'These credentials are already associated with another account.';
      case 'auth/email-already-in-use':
        return 'That email address is already in use by another account.';
      case 'auth/missing-email':
        return 'Please enter your email address.';
      case 'auth/internal-error':
        return 'An internal error occurred. Please try again later.';
      case 'auth/timeout':
        return 'The request timed out. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for authentication. Please contact support.';
      case 'auth/app-not-authorized':
        return 'This app is not authorized to use Firebase Authentication. Please contact support.';
      default:
        return fallback || 'An error occurred while attempting to sign in. Please try again.';
    }
  }

  async doForgotPassword() {
    const { value: email } = await Swal.fire({
      title: 'Forgot Password',
      input: 'email',
      inputLabel: 'Enter the email address used to log in to this system',
      inputPlaceholder: 'name@example.com',
      html: '<div class="small" style="margin-top:6px">This must be the same email address you use to log in.</div>',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Send Email',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async (value) => {
        const trimmed = (value || '').trim().toLowerCase();
        const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        if (!trimmed) {
          Swal.showValidationMessage('Please enter your email address.');
          return false;
        }
        if (!emailRegex.test(trimmed)) {
          Swal.showValidationMessage('Please enter a valid email address.');
          return false;
        }
        const res = await this.authService.resetPassword(trimmed);
        if (!res.success) {
          Swal.showValidationMessage(res.message);
          return false;
        }
        return trimmed; // pass email forward
      }
    } as any);

    if (email) {
      await Swal.fire({
        icon: 'success',
        title: 'Email Sent',
        html: `
          <div>
            We sent a password reset link to <b>${email}</b>.
            <div class="small" style="margin-top:8px">
              If you don't see it in a few minutes, check your spam or junk folder. The link may expire; if it does, request a new one.
            </div>
          </div>
        `,
        confirmButtonText: 'OK'
      });
    }
  }
}

export function emailValidator(control: UntypedFormControl): {[key: string]: any} {
    var emailRegexp = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
    if (control.value && !emailRegexp.test(control.value)) {
        return {invalidEmail: true};
    }
}
