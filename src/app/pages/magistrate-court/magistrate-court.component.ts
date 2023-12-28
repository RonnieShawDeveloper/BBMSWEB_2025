import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {take} from "rxjs";
import {Photos} from "../../models/photos";
import {Offender} from "../../models/offender";
import Swal from "sweetalert2";
import {Booking} from "../../models/booking";
import {Router} from "@angular/router";
import {Count} from "../../models/count";
import * as moment from "moment/moment";
import {Table} from "primeng/table";
import {Members} from "../../models/members";
@Component({
  selector: 'app-magistrate-court',
  templateUrl: './magistrate-court.component.html',
  styleUrls: ['./magistrate-court.component.scss']
})
export class MagistrateCourtComponent implements OnInit, OnDestroy {
  defendantResults: Offender[] = [];
  selectedDefendant: Offender = {};
  selectedBooking: Booking = {};
  lastName: string = '';
  DOB: string = '';
  mainPhotoUrl = '';
  activeBookings: Booking[] = [];
  copyBookings: Booking[] = [];
  currentMember: Members = {};

  // Switches
  showSearch = true;
  showDefendantMenu = false;
  showHearing = false;
  showBooking = false;
  initiated = false;

  subscriptions: any[] = [];

  constructor(private af: AngularFirestore, private router: Router) {

  }

  ngOnInit(): void {
    // Get all bookings from the firestore database called 'magistrateBookings' that has a status of 'Open'
    this.subscriptions.push(this.af.collection('magistrateBookings', ref => ref.where('bookingStatus', '==', 'Open')).valueChanges().subscribe((data: Booking[]) => {
    this.copyBookings = data;
    if(this.initiated == false) {
      this.initiated = true;
      this.activeBookings = data;
    }

    }));

    // Get the current member from localstorage and store it in the currentMember variable
    this.currentMember = JSON.parse(localStorage.getItem('member') || '{}');
  }

  enlargePhoto(photoURL: string, fName: string, lName: string) {
    // open a SWAL alert dialog and adjust the SWAL window to hold the image so it will show the image at 100% size
    Swal.fire({
      title: lName + ', ' + fName,
      html: '<img src="' + photoURL + '" style="width: 100%; height: auto;">',
      confirmButtonText: 'OK',
      showCancelButton: false,
      cancelButtonText: 'Cancel Photo',
      width: '30vw',
      heightAuto: true,
      padding: '0px',
      background: 'rgba(255,255,255,1)',
      backdrop: 'rgba(0,0,0,.8)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      allowEnterKey: true,
      stopKeydownPropagation: false,
      showCloseButton: true,
      closeButtonAriaLabel: 'Close Photo',
      showConfirmButton: false,
      showDenyButton: false,
      footer: '',
      didOpen: () => {

      }
    });
  }

  clear(table: Table) {
    table.clear();
  }

  showAll() {
    this.activeBookings = this.copyBookings;
  }
  showSubmitted() {
    this.activeBookings = this.copyBookings.filter(b => b.bailStatus == 'submitted');
  }
  showGranted() {
    this.activeBookings = this.copyBookings.filter(b => b.bailStatus == 'approved');
  }
  showDenied() {
    this.activeBookings = this.copyBookings.filter(b => b.bailStatus == 'denied');
  }

  doDeleteBooking(booking: Booking) {
    // open a SWAL alert dialog to confirm the deletion of the booking and if confirmed, delete the booking from the firestore database called 'magistrateBookings'
    Swal.fire({
      title: 'Delete Booking?',
      text: 'Are you sure you want to delete this booking? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete Booking',
      cancelButtonText: 'No, Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.af.collection('magistrateBookings').doc(booking.id).delete();
        Swal.fire(
          'Booking Deleted',
          'The booking has been deleted.',
          'success'
        );
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire(
          'Booking Not Deleted',
          'The booking has not been deleted.',
          'error'
        );
      }
    });
  }
  getAge(age: string|number) {
    // get the current age in years from the age provided as a string or number in the format of 'YYYY-MM-DD'
    const today = new Date();
    const birthDate = new Date(age);
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())){
      ageYears--;
    }
    return ageYears;
  }

  humanizeDate(unixDate: string) {
    // Check to see if the unixDate is null or undefined and return an empty string if it is
    if (unixDate == null || unixDate == undefined) {
      return "Date Not Set";
    }
    let unixTimestamp = parseInt(unixDate);
    // Convert the unixTimestamp to milliseconds if needed
    if (unixTimestamp.toString().length < 13) {
      unixTimestamp = unixTimestamp * 1000;
    }
    return moment(unixTimestamp).fromNow();
  }

  // Convert unixDate to localDate for display
  convertUnixDate(unixDate: string) {
    // Check to see if the unixDate is null or undefined and return an empty string if it is
    if (unixDate == null || unixDate == undefined) {
      return "Date Not Set";
    }
    let unixTimestamp = parseInt(unixDate);
    // Convert the unixTimestamp to milliseconds if needed
    if (unixTimestamp.toString().length < 13) {
      unixTimestamp = unixTimestamp * 1000;
    }

    const date = new Date(unixTimestamp);

    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = date.getMinutes();

    const amOrPm = hour < 12 ? 'AM' : 'PM';
    hour = hour % 12 || 12; // Convert hour to 12-hour format

    const formattedDate = `${month} ${day}, ${year} ${hour}:${minute.toString().padStart(2, '0')} ${amOrPm}`;

    return formattedDate;
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

  doSelect(book: Booking) {
    this.selectedBooking = book;
    this.showSearch = false;
    this.showBooking = true;
  }

  createBooking() {
    this.showBooking = true;
    this.showHearing = false;
    this.showSearch = false;
  }

  closeHearing($event) {
    this.selectedBooking = {};
    this.selectedDefendant = {};
    this.showBooking = false;
    this.mainPhotoUrl = '';
    this.defendantResults = [];
    this.showSearch = true;
    this.showHearing = false;
    for (let i = 0; i < this.subscriptions.length; i++) {
      this.subscriptions[i].unsubscribe();
    }
    // Get all bookings from the firestore database called 'magistrateBookings' that has a status of 'Open'
    this.subscriptions.push(this.af.collection('magistrateBookings', ref => ref.where('bookingStatus', '==', 'Open')).valueChanges().subscribe((data: Booking[]) => {
      this.activeBookings = data;
    }));
  }

  ngOnDestroy(): void {
    // Go through all subscriptions and unsubscribe
    for (let i = 0; i < this.subscriptions.length; i++) {
      this.subscriptions[i].unsubscribe();
    }
  }
}
