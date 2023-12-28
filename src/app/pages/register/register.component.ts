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
        style({opacity: 0, height: 0, overflow: 'hidden'}),
        animate(500, keyframes([
          style({height: '*', offset: .5}),
          style({opacity: 1, offset: 1})
        ]))
      ]),
      transition('* => void', [
        animate(500, keyframes([
          style({height: 0, offset: 0}),
          style({opacity: 0, offset: .5})
        ]))
      ]),
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
  checkCell() {
    if (this.newMember.cellPhone !== undefined && !this.newMember.cellPhone.match(this.mobNumberPattern)) {
      const cellNumber: HTMLInputElement = document.getElementById('phoneNumber') as HTMLInputElement;
      cellNumber.setAttribute('style', 'background-color: red; color: white; width: 430px');
    } else if (this.newMember.cellPhone !== undefined && this.newMember.cellPhone.match(this.mobNumberPattern)) {
      const cellNumber: HTMLInputElement = document.getElementById('phoneNumber') as HTMLInputElement;
      cellNumber.setAttribute('style', 'background-color: green; color: white; width: 430px');
    }
  }

  clearCell() {
    const cellNumber: HTMLInputElement = document.getElementById('phoneNumber') as HTMLInputElement;
    cellNumber.setAttribute('style', 'background-color: white; color: black; width: 430px');
  }

  checkPass() {
    console.log(this.newMember.password + ' ' + this.passCheck);
    if (this.passCheck !== '' && this.newMember.password !== '' && this.newMember.password !== this.passCheck) {
      const pass1: HTMLInputElement = document.getElementById('password') as HTMLInputElement;
      const pass2: HTMLInputElement = document.getElementById('password2') as HTMLInputElement;
      pass1.setAttribute('style', 'background-color: red; color: white; width: 300px');
      pass2.setAttribute('style', 'background-color: red; color: white; width: 300px');
    } else if (this.passCheck !== '' && this.newMember.password !== '' && this.newMember.password === this.passCheck) {
      const pass1: HTMLInputElement = document.getElementById('password') as HTMLInputElement;
      const pass2: HTMLInputElement = document.getElementById('password2') as HTMLInputElement;
      pass1.setAttribute('style', 'background-color: green; color: white; width: 300px');
      pass2.setAttribute('style', 'background-color: green; color: white; width: 300px');
    }
  }

  checkEmail() {
    const emailRegex = '(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\])';
    if (!this.newMember.email.match(emailRegex)) {
      const emailEle: HTMLInputElement = document.getElementById('emailAddress') as HTMLInputElement;
      emailEle.setAttribute('style', 'width: 430px; background-color: red; color: white');
    } else if (this.newMember.email.match(emailRegex)) {
      const emailEle: HTMLInputElement = document.getElementById('emailAddress') as HTMLInputElement;
      emailEle.setAttribute('style', 'width: 430px; background-color: green; color: white');
    }
  }

  resetEmail() {
    const emailEle: HTMLInputElement = document.getElementById('emailAddress') as HTMLInputElement;
    emailEle.setAttribute('style', 'width: 430px; background-color: white; color: black');
  }


  clearPass() {
    const pass1: HTMLInputElement = document.getElementById('password') as HTMLInputElement;
    const pass2: HTMLInputElement = document.getElementById('password2') as HTMLInputElement;
    pass1.setAttribute('style', 'background-color: white; color: black; width: 300px');
    pass2.setAttribute('style', 'background-color: white; color: black; width: 300px');
    pass2.value = '';
  }

  capitalize(event) {
    if (event.target.value !== undefined && event.target.value.length >= 1) {
      event.target.style.backgroundColor = 'green';
      event.target.style.color = 'white';
      const ele: HTMLInputElement = event.target as HTMLInputElement;
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
      event.target.style.backgroundColor = 'white';
      event.target.style.color = 'black';

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

  submitpage1() {
    this.page1Invalid = false;
    Array.from(document.getElementsByTagName('input') as HTMLCollection).forEach(node => {
      const curElement: HTMLInputElement = node as HTMLInputElement;
      const eleID = curElement.id;
      if (eleID === 'firstName' ||
        eleID === 'lastName' ||
        eleID === 'emailAddress' ||
        eleID === 'phoneNumber' ||
        eleID === 'password') {
        if (curElement.value === '') {
          curElement.setAttribute('style', 'width:' + curElement.style.width + ';background-color: yellow; color: white');
          this.page1Invalid = true;
        }
      }
      if (curElement.style.backgroundColor === 'yellow' || curElement.style.backgroundColor === 'red') {
        this.page1Invalid = true;
        console.log('Page Invalid');
      }

    });
    // If page form is valid, continue
    if (this.page1Invalid === false) {
      // check members and see if this email already exist in database

      // if all is well, go on to the next page
      this.screenOne = false;
      this.screenTwo = true;
    }
  }

  submitpage2() {
    if (typeof this.newMember.requested !== 'undefined') {
      this.screenTwo = false;
      this.screenThree = true;
    } else {
      document.getElementById('position').setAttribute('style', 'background-color: red; color: white');
    }
  }

  submitpage3() {
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

  clearInput(event) {
    if (event.target.style.backgroundColor !== 'green') {
      event.target.style.backgroundColor = 'white';
      event.target.style.color = 'black';
    }
  }

  clearForm() {
    Array.from(document.getElementsByTagName('input') as HTMLCollection).forEach(node => {
      const curElement: HTMLInputElement = node as HTMLInputElement;
      curElement.setAttribute('style', 'width:' + curElement.style.width + ';background-color: white; color: black');
      curElement.value = '';
    });
  }

  doCancel() {
    this.router.navigate(['/login']);
  }
}
