import { Component } from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {take} from "rxjs";
import {Photos} from "../../models/photos";
import {Offender} from "../../models/offender";
import Swal from "sweetalert2";
import {Booking} from "../../models/booking";
import {Router} from "@angular/router";

declare var csharks: any;

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss']
})
export class BookingsComponent {
  defendantResults: Offender[] = [];
  selectedDefendant: Offender = {};
  selectedBooking: Booking = {};
  lastName: string = '';
  DOB: string = '';
  mainPhotoUrl = '';

  // Switches
  showSearch = true;
  showDefendantMenu = false;
  showViewBooking = false;

  subscriptions: any[] = [];



  constructor(private af: AngularFirestore, private router: Router) {

  }
  doSearch() {
    // Capitalize the first letter of the last name AND Lowercase the rest of the letters in the last name
    this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();

    // Search the firestore database called 'user' for 'lName' equal to the last name entered in the search box and dob equal to the DOB entered in the search box with a format of YYYY-MM-DD
    this.subscriptions.push(this.af.collection('users', ref => ref.where('lName', '==', this.lastName)).valueChanges().pipe(take(1)).subscribe((data: Offender[]) => {
      this.defendantResults = data;
      // console.log('defendantResults', this.defendantResults)
      this.getPhoto();
      // If no results are found, display a message to the user
      if (this.defendantResults.length == 0) {
        Swal.fire({
          title: 'No results found',
          text: 'Please check the spelling of the last name and date of birth and try again.',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
      }
    }));
  }

  getPhoto() {
    // Loop through each Defendant in the defendantResults array
    for (let i = 0; i < this.defendantResults.length; i++) {
      // Get the defendant's ID
      const id = this.defendantResults[i].spn;
      this.defendantResults[i].mainPhoto = '';
      // console.log('id', id);
      // Get the defendant's photo from the firestore database called 'user' where the id is equal to the defendant's id
      this.subscriptions.push(this.af.collection('photos', ref => ref.where('offenderID', '==', id)).valueChanges().pipe(take(1)).subscribe((data: Photos[]) => {
        // Check to see if any photos were found and if not, set the defendant's mainPhoto to '/assets/img/users/default-user.jpg' and move on to next defendant
        if (data.length == 0) {
          this.defendantResults[i].mainPhoto = '/assets/img/users/default-user.jpg';
          return;
        }
        // console.log('data', data);
        // Loop through the 'photos' array in the 'data' object and find the photo with 'photoMain' equal to true and set the 'defendantResults[i].mainPhoto' to the photoUrl of that photo
        for (let j = 0; j < data[0].photos.length; j++) {
          if (data[0].photos[j].photoMain == true) {
            this.defendantResults[i].mainPhoto = data[0].photos[j].photoUrl;
            // console.log('mainPhoto', this.defendantResults[i].mainPhoto);
          }
        }
        // Check if a main photo was found and if not, use the photo found in '/assets/img/users/default-user.jpg'
        if (this.defendantResults[i].mainPhoto == '') {
          this.defendantResults[i].mainPhoto = '/assets/img/users/default-user.jpg';
        }
      }));
    }

  } // end getPhoto

  doSelect(def) {
    console.log('def', def);
    this.selectedDefendant = def;
    this.showSearch = false;
    this.showDefendantMenu = true;
  }

  doViewBooking(bookid) {
    this.selectedBooking = bookid;
    this.showSearch = false;
    this.showDefendantMenu = false;
    this.showViewBooking = true;
  }

  closeMenu(event) {
    // Loop through each subscription and unsubscribe
    for (let i = 0; i < this.subscriptions.length; i++) {
      this.subscriptions[i].unsubscribe();
    }
    this.showSearch = true;
    this.showDefendantMenu = false;
    this.defendantResults = [];
    this.selectedDefendant = {};
    this.selectedBooking = {};
    this.lastName = '';
    this.DOB = '';
  }

  closeViewBooking() {
    this.showSearch = false;
    this.showViewBooking = false;
    this.showDefendantMenu = true;
    this.selectedBooking = {};
  }

}
