import { Component, ViewEncapsulation } from '@angular/core';
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
export class LoginComponent {
  public router: Router;
  public form:UntypedFormGroup;
  public email:AbstractControl;
  public password:AbstractControl;

  constructor(router:Router, fb:UntypedFormBuilder, private authService:AuthService) {
      this.router = router;
      this.form = fb.group({
          'email': ['', Validators.compose([Validators.required, emailValidator])],
          'password': ['', Validators.compose([Validators.required, Validators.minLength(6)])]
      });

      this.email = this.form.controls['email'];
      this.password = this.form.controls['password'];
  }

  public onSubmit(values:Object):void {
      if (this.form.valid) {
        // Create swal alert to let the user know that they are being logged in
        Swal.fire({
          title: 'Logging In',
          text: 'Please wait...',
          allowOutsideClick: false,
          showConfirmButton: false,
          willOpen: () => {
            Swal.showLoading();
          }
        });
          this.authService.login(this.email.value, this.password.value);
      }
  }

  ngAfterViewInit(){
      document.getElementById('preloader').classList.add('hide');
  }

  doForgotPassword() {
    // Use Swal to ask for the user's email address and send a password reset email using the auth service and wait for the return promise
    Swal.fire({
      title: 'Forgot Password',
      html: '<div>Enter your email into the box below. A Password Reset Link will be sent to this email if it exist.</div><input id="swal-input1" class="swal2-input" placeholder="Email">',
      confirmButtonText: 'Send Email',
      cancelButtonText: 'Cancel',
      showCancelButton: true,
      focusConfirm: false,
      preConfirm: () => {
        return {
          email: (<HTMLInputElement>document.getElementById('swal-input1')).value
        }
      }
    } as any).then((result) => {
      if (result.isConfirmed) {
        this.authService.resetPassword(result.value.email).then((v) => {
          if(v) {
          Swal.fire({
            icon: 'success',
            title: 'Email Sent',
            text: 'Please check your email for password reset instructions.'
           });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'An error occurred while sending the email.'
            });
          }
        }).catch((error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
          });
        });
      }
    });
  }
}

export function emailValidator(control: UntypedFormControl): {[key: string]: any} {
    var emailRegexp = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
    if (control.value && !emailRegexp.test(control.value)) {
        return {invalidEmail: true};
    }
}
