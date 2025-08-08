import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Members } from '../../models/members';
import {NgForm} from '@angular/forms';
import {loggedIn} from '@angular/fire/auth-guard';
import {animate, keyframes, style, transition, trigger} from '@angular/animations';
import {AuthService} from '../../services/auth.service';
import {Router} from "@angular/router";
import Swal from "sweetalert2";

@Component({
  selector: 'app-member-signup',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({opacity: 0, transform: 'translateX(50px)'}),
        animate('500ms ease-out', style({opacity: 1, transform: 'translateX(0)'}))
      ]),
      transition('* => void', [
        animate('500ms ease-in', style({opacity: 0, transform: 'translateX(-50px)'}))
      ]),
    ]),
    trigger('stepTransition', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(50px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('500ms ease-in', style({ opacity: 0, transform: 'translateX(-50px)' }))
      ])
    ])
  ]
})
export class RegisterComponent implements OnInit {
  screenOne = true;
  screenTwo = false;
  screenThree = false;
  screenFour = false;
  screenEmail = false;

  memberAuth: any;

  isValidCell = true;

  newMember: Members = {};
  passCheck = '';

  page1Invalid = false;

  mobNumberPattern = '^[2-9]\\d{2}-\\d{3}-\\d{4}$';

  /**
   * Calculates the progress percentage for the stepper progress bar
   * @returns {number} The percentage of completion (25%, 50%, 75%, or 100%)
   */
  getProgressPercentage(): number {
    if (this.screenFour) {
      return 100;
    } else if (this.screenThree) {
      return 75;
    } else if (this.screenTwo) {
      return 50;
    } else {
      return 25;
    }
  }


  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    // Using the Members model, initialize the newMember object and place empty strings in each string field.
    this.newMember = {
      fName: '',
      lName: '',
      email: '',
      cellPhone: '',
      password: '',
      address: '',
      dob: '',
      authRegistrarClerk: false,
      authJudge: false,
      authAdmin: false,
      authJudgeClerk: false,
      authAttorney: false,
      authRegistrar: false,
      authClerk: false,
      authPrivAttorney: false,
      authMagistrate: false,
      status: 'New',
      comments: '',
      emailVerified: false,
      photoURL: '',
      uid: '',
      lastLogin: '',
      memberSince: '',
      mName: '',
      name: '',
      requested: '',
      id: '',
      spn: '',
      position: '',
      workPhone: '',
    }


  }
  /**
   * Validates the cell phone number format
   */
  checkCell() {
    const cellNumber: HTMLInputElement = document.getElementById('phoneNumber') as HTMLInputElement;

    if (this.newMember.cellPhone !== undefined && !this.newMember.cellPhone.match(this.mobNumberPattern)) {
      cellNumber.classList.remove('is-valid');
      cellNumber.classList.add('is-invalid');
    } else if (this.newMember.cellPhone !== undefined && this.newMember.cellPhone.match(this.mobNumberPattern)) {
      cellNumber.classList.remove('is-invalid');
      cellNumber.classList.add('is-valid');
    }
  }

  /**
   * Clears the cell phone validation styling
   */
  clearCell() {
    const cellNumber: HTMLInputElement = document.getElementById('phoneNumber') as HTMLInputElement;
    cellNumber.classList.remove('is-valid', 'is-invalid');
  }

  /**
   * Validates that both password fields match
   */
  checkPass() {
    const pass1: HTMLInputElement = document.getElementById('password') as HTMLInputElement;
    const pass2: HTMLInputElement = document.getElementById('password2') as HTMLInputElement;

    if (this.passCheck !== '' && this.newMember.password !== '') {
      if (this.newMember.password !== this.passCheck) {
        pass1.classList.remove('is-valid');
        pass2.classList.remove('is-valid');
        pass1.classList.add('is-invalid');
        pass2.classList.add('is-invalid');
      } else {
        pass1.classList.remove('is-invalid');
        pass2.classList.remove('is-invalid');
        pass1.classList.add('is-valid');
        pass2.classList.add('is-valid');
      }
    }
  }

  /**
   * Validates the email format
   */
  checkEmail() {
    const emailRegex = '(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\])';
    const emailEle: HTMLInputElement = document.getElementById('emailAddress') as HTMLInputElement;

    if (!this.newMember.email.match(emailRegex)) {
      emailEle.classList.remove('is-valid');
      emailEle.classList.add('is-invalid');
    } else {
      emailEle.classList.remove('is-invalid');
      emailEle.classList.add('is-valid');
    }
  }

  /**
   * Clears the email validation styling
   */
  resetEmail() {
    const emailEle: HTMLInputElement = document.getElementById('emailAddress') as HTMLInputElement;
    emailEle.classList.remove('is-valid', 'is-invalid');
  }

  /**
   * Clears the password validation styling and resets the confirmation field
   */
  clearPass() {
    const pass1: HTMLInputElement = document.getElementById('password') as HTMLInputElement;
    const pass2: HTMLInputElement = document.getElementById('password2') as HTMLInputElement;

    pass1.classList.remove('is-valid', 'is-invalid');
    pass2.classList.remove('is-valid', 'is-invalid');
    pass2.value = '';
  }

  /**
   * Capitalizes the first letter of name fields and validates input
   */
  capitalize(event) {
    const ele: HTMLInputElement = event.target as HTMLInputElement;

    if (event.target.value !== undefined && event.target.value.length >= 1) {
      ele.classList.remove('is-invalid');
      ele.classList.add('is-valid');

      if (ele.id === 'firstName') {
        this.newMember.fName = this.newMember.fName.charAt(0).toUpperCase() + this.newMember.fName.slice(1).toLowerCase();
      }
      if (ele.id === 'middleName') {
        this.newMember.mName = this.newMember.mName.charAt(0).toUpperCase() + this.newMember.mName.slice(1).toLowerCase();
      }
      if (ele.id === 'lastName') {
        this.newMember.lName = this.newMember.lName.charAt(0).toUpperCase() + this.newMember.lName.slice(1).toLowerCase();
      }
    } else {
      ele.classList.remove('is-valid');
      ele.classList.add('is-invalid');
    }
  }

  checkPosition() {
    if (this.newMember.requested === 'prison') {
      return 'Prison Access';
    }
    if (this.newMember.requested === 'magistrate_registrar') {
      return 'Magistrate Court Clerk';
    }
    if (this.newMember.requested === 'magistrate_registrar_clerk') {
      return 'Magistrate Court Clerk Staff';
    }
    if (this.newMember.requested === 'supreme_registrar') {
      return 'Supreme Court Registrar';
    }
    if (this.newMember.requested === 'supreme_registrar') {
      return 'Supreme Court Registrar Staff';
    }
    if (this.newMember.requested === 'magistrate_judge') {
      return 'Magistrate Court Judge';
    }
    if (this.newMember.requested === 'supreme_judge') {
      return 'Supreme Court Judge';
    }
    if (this.newMember.requested === 'supreme_judge') {
      return 'Supreme Court Judicial Assistant';
    }
    if (this.newMember.requested === 'public_attorney') {
      return 'DPP Office';
    }
    if (this.newMember.requested === 'private_attorney') {
      return 'Private Attorney Access';
    }
    return 'Other Department Access';

  }

  /**
   * Validates and submits the first step of the registration form
   */
  submitpage1() {
    this.page1Invalid = false;

    // Check required fields
    Array.from(document.getElementsByTagName('input') as HTMLCollection).forEach(node => {
      const curElement: HTMLInputElement = node as HTMLInputElement;
      const eleID = curElement.id;

      if (eleID === 'firstName' ||
        eleID === 'lastName' ||
        eleID === 'emailAddress' ||
        eleID === 'phoneNumber' ||
        eleID === 'password') {
        if (curElement.value === '') {
          curElement.classList.remove('is-valid');
          curElement.classList.add('is-invalid');
          this.page1Invalid = true;
        }
      }

      // Check if any field has validation errors
      if (curElement.classList.contains('is-invalid')) {
        this.page1Invalid = true;
      }
    });

    // If page form is valid, continue to next step
    if (this.page1Invalid === false) {
      // check members and see if this email already exist in database
      // if all is well, go on to the next page
      this.screenOne = false;
      this.screenTwo = true;
    } else {
      // Show validation message
      Swal.fire({
        title: 'Form Validation',
        text: 'Please complete all required fields correctly before continuing.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
    }
  }

  /**
   * Validates and submits the second step of the registration form
   */
  submitpage2() {
    const positionSelect = document.getElementById('position') as HTMLSelectElement;

    if (typeof this.newMember.requested !== 'undefined' && this.newMember.requested !== '') {
      positionSelect.classList.remove('is-invalid');
      positionSelect.classList.add('is-valid');
      this.screenTwo = false;
      this.screenThree = true;
    } else {
      positionSelect.classList.remove('is-valid');
      positionSelect.classList.add('is-invalid');

      Swal.fire({
        title: 'Department Required',
        text: 'Please select your department before continuing.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
    }
  }

  /**
   * Submits the final registration form and creates the user account
   */
  submitpage3() {
    // Show loading indicator
    Swal.fire({
      title: 'Creating Account',
      text: 'Please wait while we process your registration...',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    this.newMember.name = this.newMember.fName + ' ' + this.newMember.mName + ' ' + this.newMember.lName;
    this.authService.register(this.newMember.email, this.newMember.password)
      .then(res => {
        this.memberAuth = res;
        if (this.memberAuth.user.emailVerified === false) {
          this.memberAuth.user.sendEmailVerification();
          this.newMember.uid = this.memberAuth.user.uid;
          this.newMember.status = 'New';
          this.authService.saveNewMember(this.newMember);
          this.screenThree = false;
          this.screenFour = true;
          Swal.close();
        }
      }).catch(err => {
      console.log(err);
      if (err.code === 'auth/email-already-in-use') {
        this.screenThree = false;
        Swal.fire({
          title: 'Email Already Exists',
          text: 'This email address is already in use. Please login using this email address.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then((result) => {
          this.router.navigate(['/login']);
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'There was an error creating your account. Please try again later.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then((result) => {
          this.router.navigate(['/login']);
        });
      }
    });
  }

  /**
   * Clears input field styling when focused
   */
  clearInput(event) {
    const element = event.target as HTMLInputElement;
    if (!element.classList.contains('is-valid')) {
      element.classList.remove('is-valid', 'is-invalid');
    }
  }

  /**
   * Clears all form fields and resets validation styling
   */
  clearForm() {
    Array.from(document.getElementsByTagName('input') as HTMLCollection).forEach(node => {
      const curElement: HTMLInputElement = node as HTMLInputElement;
      curElement.classList.remove('is-valid', 'is-invalid');
      curElement.value = '';
    });

    // Reset model values
    this.newMember = {
      fName: '',
      lName: '',
      email: '',
      cellPhone: '',
      password: '',
      mName: '',
      requested: '',
      position: '',
      workPhone: '',
      comments: ''
    };

    this.passCheck = '';
  }

  doCancel() {
    this.router.navigate(['/login']);
  }
}
