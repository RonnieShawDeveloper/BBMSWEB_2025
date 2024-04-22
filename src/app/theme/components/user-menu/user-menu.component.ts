import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {Members} from "../../../models/members";
import Swal from "sweetalert2";
import {HttpClient} from "@angular/common/http";
import {AuthService} from "../../../services/auth.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserMenuComponent implements OnInit {
  member: Members = JSON.parse(localStorage.getItem('member'));
  constructor(private https: HttpClient, private auth: AuthService, private db: AngularFirestore) { }

  ngOnInit() {
    console.log('Member: ', this.member);
  }

  doChangeEmail() {
    // Create a swal dialog asking the user to enter a new email and let the user know that they will be logged out and they will need to verify their new email
    Swal.fire({
      title: 'Change Email',
      html: '<div class="text-danger"><b>WARNING! YOU ARE ABOUT TO CHANGE<br>YOUR EMAIL ADDRESS!</b></div><div class="text-white border border-danger bg-danger font-weight-bold">CURRENT EMAIL:<br>'+this.member.email.toUpperCase()+'</div>You will be logged out and you will need to use your new email to log back in!<hr>' +
        '<input id="swal-input1" class="form-control" placeholder="Enter your new email"><br><input id="swal-input2" class="form-control" placeholder="Reenter new email">',
      showCancelButton: true,
      confirmButtonText: 'Change',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const newEmail = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const reenterEmail = (document.getElementById('swal-input2') as HTMLInputElement).value;
        //verify the new email and the reentered email match
        if (newEmail !== reenterEmail) {
          Swal.showValidationMessage('Emails do not match');
          // Clear the input fields
          (document.getElementById('swal-input1') as HTMLInputElement).value = '';
          (document.getElementById('swal-input2') as HTMLInputElement).value = '';
        }

        if (newEmail === '' || reenterEmail === '') {
          Swal.showValidationMessage('Email is required');
        }
        //verify the email meets the requirements
        if (!newEmail.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
          Swal.showValidationMessage('Invalid Email');
        }
        return newEmail;
      }
    }).then((result) => {
      // Create a swal dialog telling them to standby while the email is being changed
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Please Standby',
          text: 'Your email is being changed. Please standby...',
          icon: 'info',
          showConfirmButton: false
        });
      }
      if (result.value) {
        // Make a get request to 'https://us-central1-bbms-1283c.cloudfunctions.net/changeEmail' with the new email and the member's id
        this.https.get('https://us-central1-bbms-1283c.cloudfunctions.net/changeEmail?email=' + result.value + '&uid=' + this.member.uid).subscribe((res: any) => {
          console.log('res: ', res);
          if (res == true) {
            Swal.fire({
              title: 'Success',
              text: `Email has been changed. Your new email is ${result.value}. You will be logged out. `,
              icon: 'success',
              confirmButtonText: 'Ok'
            }).then(() => {
                // Change the email in the member record in the database
                this.db.collection('members').doc(this.member.id).update({email: result.value}).then(() => {
                this.auth.logout();
              });
            });
          } else {
            Swal.fire({
              title: 'Error',
              text: 'An error occurred. Please try again later.',
              icon: 'error',
              confirmButtonText: 'Ok'
            });
          }
        });
      }
    });

  }

  doTakePicture() {
    Swal.fire({
      title: 'Coming Soon!',
      text: 'This feature will be available soon.',
      icon: 'info',
      confirmButtonText: 'Ok'
    });
  }

}
