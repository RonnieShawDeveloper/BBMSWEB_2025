import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Hearings} from "../../../models/hearings";
import Swal from "sweetalert2";
import {HearingServiceService} from "../../../services/hearing-service.service";
import {BookingService} from "../../../services/booking.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {AngularFireStorage} from "@angular/fire/compat/storage";

@Component({
  selector: 'app-termination',
  templateUrl: './termination.component.html',
  styleUrls: ['./termination.component.scss']
})
export class TerminationComponent {

  @Input() hearing: Hearings;
  @Output() closeMenu: EventEmitter<boolean> = new EventEmitter<boolean>();

  terminationIndex = '';

  constructor(private fs: AngularFirestore, private storage: AngularFireStorage, private hs: HearingServiceService, bs: BookingService) {
  }

  doSubmit() {
    console.log('Termination Type: ' + this.terminationIndex);
    // Check to see that 'terminationIndex = '1' or '2' or '3'
    if (this.terminationIndex === '') {
      Swal.fire({
        title: 'Error',
        text: 'Please select a Termination Type',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    // Close the Application and leave the Booking open
    if (this.terminationIndex === '1') {
      // Create a Swal Alert confirming the user wants to close the application
      Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to close the Bail Application and leave the booking open',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, close the Bail Application',
        cancelButtonText: 'No, cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.hearing.active = false;
          this.hearing.terminationComment = "Bail Application Closed";
          this.hearing.terminationDate = Date.now().toString();
          this.hearing.terminationType = "Bail Application Closed - Leave Booking Open";
          this.hs.updateHearing(this.hearing);
          this.fs.collection('bookings').doc(this.hearing.bookingID).update({
            bailAppPending: false,
            bailAppSubmitedDate: '',
            bookingStatus: 'Open',
            bailStatus: '',
          });
          this.closeMenu.emit(true);
        }
      });
    }
    // Close the Application and Booking
    if (this.terminationIndex === '2') {
      Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to close the Bail Application and the Booking',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, close everything!',
        cancelButtonText: 'No, cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.hearing.active = false;
          this.hearing.terminationComment = "Bail Application Closed";
          this.hearing.terminationDate = Date.now().toString();
          this.hearing.terminationType = "Bail Application Closed - Booking Closed";
          this.hs.updateHearing(this.hearing);
          this.fs.collection('bookings').doc(this.hearing.bookingID).update({
            bailAppPending: false,
            bailAppSubmitedDate: '',
            bookingStatus: 'Closed',
            bailStatus: '',
          });
          this.closeMenu.emit(true);
        }
      });
    }
    // Delete the Application as Error
    if (this.terminationIndex === '3') {
      Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete the Bail Application! This can not be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete the Bail Application',
        cancelButtonText: 'No, cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          try {
            // Check to see if 'this.hearing.bailAppLink' starts with 'https:'
            if (this.hearing.bailAppLink.startsWith('https://firebasestorage.googleapis.com')) {
              // Get the BailAppLink from the hearing and delete the document from storage
              this.storage.refFromURL(this.hearing.bailAppLink).delete();

            }
          } catch (e) {
            console.log(e);
            // Create a swal modal to inform the user that the file was not deleted
            Swal.fire({
              title: 'Error',
              text: 'The Bail Application was not deleted from storage',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          }
          this.closeMenu.emit(true);
        }
        try {

          // Delete the hearing from the database
          this.fs.collection('hearings').doc(this.hearing.id).delete();
          this.fs.collection('bookings').doc(this.hearing.bookingID).update({
            bailAppPending: false,
            bailAppSubmitedDate: '',
            bookingStatus: 'Open',
            bailStatus: '',
          });
          this.closeMenu.emit(true);
        } catch (e) {
          console.log(e);
          // Create a swal modal to showing the user the error
          Swal.fire({
            title: 'Error',
            text: 'The Bail Application was not deleted from the database',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      });
    }
  }
  doCancel() {
    this.closeMenu.emit(false);
  }
}
