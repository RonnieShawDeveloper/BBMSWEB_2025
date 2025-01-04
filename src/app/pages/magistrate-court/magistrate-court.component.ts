import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, DocumentSnapshot} from "@angular/fire/compat/firestore";
import {take} from "rxjs";
import {Photos} from "../../models/photos";
import {Offender} from "../../models/offender";
import Swal from "sweetalert2";
import {Booking} from "../../models/booking";
import {BookingEvents} from "../../models/events";
import {Router} from "@angular/router";
import {Count} from "../../models/count";
import * as moment from "moment/moment";
import {Table} from "primeng/table";
import {Members} from "../../models/members";
import {KioskLogs} from "../../models/kiosk-logs";
import {reauthenticateWithCredential} from "@angular/fire/auth";
import firebase from "firebase/compat/app";
import {HttpClient} from "@angular/common/http";


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

  bookingStatuses: string[] = [];
  counts: Count;
  releasedCount: number = 0;

  // Switches
  showSearch = true;
  showDefendantMenu = false;
  showHearing = false;
  showBooking = false;
  showSuretor: boolean = false;
  initiated = false;

  subscriptions: any[] = [];
  KioskLogs: KioskLogs[] = [];
  lateChecks: Booking[] = [];

  user = firebase.auth().currentUser;

  agingReport: any;

  constructor(private af: AngularFirestore, private router: Router, private http: HttpClient, private fs: AngularFirestore) {

  }

  ngOnInit(): void {
    // Get all bookings from the firestore database called 'magistrateBookings' that has a status of 'Open'
    this.subscriptions.push(this.af.collection('magistrateBookings', ref => ref.where('bookingStatus', '==', 'Open')).valueChanges().subscribe((data: Booking[]) => {
      this.copyBookings = data;
      if (this.initiated == false) {
        this.initiated = true;
        this.activeBookings = data;
      }

      // Call the new function to process the magistrateBookings data
      this.countBookingStatus();
      this.countReleased();

    }));

    // Get the current member from localstorage and store it in the currentMember variable
    this.currentMember = JSON.parse(localStorage.getItem('member') || '{}');

    // Get the Unix Timestamp in milliseconds for 1 month ago
    const oneMonthAgo = new Date().getTime() - 2592000000;
    // Get all entries from Firstore database called "kioskLogs" where "title" is equal to "AFIS ID" and the "unix" is greater than the Unix Timestamp for 1 month ago
    this.subscriptions.push(this.af.collection('kioskLogs', ref => ref
      .where('title', '==', 'AFIS ID'))
      .valueChanges().subscribe((data: KioskLogs[]) => {
        this.KioskLogs = data;
        // Loop through the kioskLogs array and remove any record from the kioskLogs array older than 1 month using the unix field as the timestamp in milliseconds
        for (let i = 0; i < this.KioskLogs.length; i++) {
          if (parseInt(this.KioskLogs[i].unix) < oneMonthAgo) {
            this.KioskLogs.splice(i, 1);
          }
        }
        // Sort the kioskLogs array by the unix field showing the newest entries first
        this.KioskLogs.sort((a, b) => (parseInt(a.unix) > parseInt(b.unix)) ? -1 : 1);
        // Loop through each activeBooking and send it to the getLastCheckin function to get the last checkin date and time
        for (let i = 0; i < this.activeBookings.length; i++) {
          this.getLastCheckin(this.activeBookings[i]);
        }
      }));
  }


  processMagistrateBookings() {
    // Create a swal alert dialog to confirm the generation of the aging report with loading spinner
    Swal.fire({
      title: 'Generating Aging Report',
      text: 'Please wait while the report is being generated...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const bookingsWithEvents: {
      name: string;
      bookingAge: number;
      events: {
        description: string;
        eventDate: string;
        daysSinceBooking: number;
        type?: string;
      }[];
      highlight?: string; // yellow or red based on conditions
      missingApproval?: boolean; // Add a "NO SURETOR APPROVAL FOUND - AGE WARNING" row if true
    }[] = [];

    // Sort the bookings by unixDate (newest first)
    const sortedBookings = this.copyBookings.sort(
      (a, b) => parseInt(b.unixDate, 10) - parseInt(a.unixDate, 10)
    );

    const promises = sortedBookings.map((booking: Booking) => {
      // Parse the booking creation date from bookDate
      const bookingCreationDate = new Date(booking.bookDate);
      const bookingAge = Math.floor(
        (new Date().getTime() - bookingCreationDate.getTime()) / 86400000
      ); // Days since creation

      // Query events for this booking from the "BookingEvents" collection
      return this.af
        .collection('BookingEvents', (ref) => ref.where('bookingID', '==', booking.id))
        .get()
        .toPromise()
        .then((snapshot) => {
          const eventDetails = snapshot.docs.map((doc) => {
            const event = doc.data() as BookingEvents; // Correct model type
            const eventDate = new Date(event.date); // Parse the "date" field
            const daysSinceBooking = Math.floor(
              (eventDate.getTime() - bookingCreationDate.getTime()) / 86400000
            ); // Days between event and booking

            return {
              description: event.title,
              eventDate: eventDate.toDateString(),
              daysSinceBooking,
              type: event.type,
            };
          });

          const approveSurtorEvent = eventDetails.find((event) => event.type === 'approveSurtor');
          let highlight: string | undefined;
          let missingApproval = false;

          if (approveSurtorEvent) {
            highlight = 'green'; // Booking has been approved
          } else {
            // No approveSurtor event; check booking age
            if (bookingAge > 60) {
              highlight = 'red';
              missingApproval = true; // Trigger warning row
            } else if (bookingAge > 30) {
              highlight = 'orange';
              missingApproval = true; // Trigger warning row
            } else if (bookingAge > 15) {
              highlight = 'yellow';
            }
          }

          bookingsWithEvents.push({
            name: `${booking.lastName}, ${booking.firstName} ${booking.middleName || ''}`.trim(),
            bookingAge,
            events: eventDetails,
            highlight,
            missingApproval, // Add warning row only if age > 30 and no approveSurtor found
          });
        });
    });

    // Wait for all event queries to complete
    Promise.all(promises)
      .then(() => {
        Swal.close(); // Close the loading dialog
        this.displayAgeReport(bookingsWithEvents);
      })
      .catch((error) => {
        Swal.close(); // Close the loading dialog if an error occurs
        console.error('Error fetching booking events:', error);
      });
  }

  displayAgeReport(data: {
    name: string;
    bookingAge: number;
    events: {
      description: string;
      eventDate: string;
      daysSinceBooking: number;
      type?: string;
    }[];
    highlight?: string;
    missingApproval?: boolean;
  }[]) {

    // Sort the data by booking age (youngest first)
    data.sort((a, b) => a.bookingAge - b.bookingAge);


    let html = `<div style="max-height: 80vh; overflow-y: auto;">
    <p style="font-weight: bold;">This report shows the age of each booking and the events. The report is color-coded to highlight bookings that have not had the suretor approved.</p>
    <p style="font-weight: bold;">Green means in compliance, Red: Over 60 days, Orange: over 30 days and Yellow: 15 Days</p>`;

    data.forEach((item) => {
      const tableStyle =
        item.highlight === 'yellow'
          ? 'background-color: yellow;'
          : item.highlight === 'red'
            ? 'background-color: red; color: white;'
            : item.highlight === 'green'
              ? 'background-color: lightgreen; color: black;'
              : item.highlight === 'orange'
                ? 'background-color: orange; color: black;'
            : '';

      html += `<table border="1" style="margin-bottom: 2px; width:100%; border-collapse: collapse; ${tableStyle}">
      <thead>
        <tr>
          <th colspan="2">OFFENDER NAME</th>
          <th>BOOKING AGE AS OF TODAY</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="2">${item.name}</td>
          <td>${item.bookingAge} days</td>
        </tr></tbody></table>
      <table border="1" style="margin-top: 1px;width:100%; border-collapse: collapse; margin-bottom: 20px; ${tableStyle}">
      <thead>
        <tr>
          <th>EVENT</th>
          <th>DATE</th>
          <th>AGE</th>
        </tr>
      </thead>
    `;
      if (item.missingApproval) {
        html += `<tr style="background-color: darkred; color: white;">
        <td colspan="3">NO SURETOR APPROVAL FOUND - OVER 30 DAYS!</td>
      </tr>`;
      }

      item.events.forEach((event) => {
        html += `<tr>
        <td style="width: 70%">${event.description}</td>
        <td style="width: 20%">${event.eventDate}</td>
        <td style="width: 10%">${event.daysSinceBooking} days</td>
      </tr>`;
      });

      html += `</tbody>
    </table>
    <div style="margin: 0; width:100%; height: 3px; background-color: darkgrey"></div>
    `;
    });

    html += `</div>`;

    Swal.fire({
      title: 'Magistrate Bookings Age Report',
      html: html,
      width: '800px',
      heightAuto: false, // Fix the height for scrolling
      confirmButtonText: 'Close',
    });
  }


  getLastCheckin(offender: Booking): string {
    if (offender.afisID == undefined || offender.afisID == null) {
      return 'AFIS NOT LINKED';
    }
    // loop through the kioskLogs array and get the last 10 characters of the description field and check to see if it equals the afisID
    for (let i = 0; i < this.KioskLogs.length; i++) {
      if (this.KioskLogs[i].description.slice(-10) == offender.afisID) {
        offender.lateCheckin = false;
        // Check if the unix date is more than 7 days ago and if so, set "late" to true
        if (parseInt(this.KioskLogs[i].unix) < new Date().getTime() - 604800000) {
          offender.lateCheckin = true;
          this.lateChecks.push(offender);
        }
        return this.humanizeDate(this.KioskLogs[i].unix) + " (" + this.KioskLogs[i].datetime + ") at " + this.KioskLogs[i].location;
      }
    }
    return 'NO CHECKIN FOUND';
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

  showNassau() {
    this.activeBookings = this.copyBookings.filter(b => b.court == 'Nassau');
  }

  showGrandBahamas() {
    this.activeBookings = this.copyBookings.filter(b => b.court == 'Grand Bahama');
  }

  showAbaco() {
    this.activeBookings = this.copyBookings.filter(b => b.court == 'Abaco');
  }

  showClosed() {
    this.af.collection('magistrateBookings', ref => ref.where('bookingStatus', '==', 'Closed')).valueChanges().pipe(take(1)).subscribe((closedBooks: Booking[]) => {
      this.activeBookings = closedBooks;
    });
    // this.activeBookings = this.copyBookings.filter(b => b.bookingStatus == 'Closed');
  }

  showDeleted() {
    this.activeBookings = this.copyBookings.filter(b => b.bookingStatus == 'Deleted');
  }

  // I need to create a count based on each of the different booking statuses found in bookingStatus so I can show a badge on the dashboard for each status
  countBookingStatus() {
    this.bookingStatuses = this.copyBookings.map(b => b.bailStatus);
    this.counts = this.bookingStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Count);
    // Add a total count to the counts object
    this.counts.total = this.copyBookings.length;
  }

  // Using the custodyStatus options, I need to create a count based on all of the released statuses so I can show the total number of offenders released
  countReleased() {
    // Using these custodyStatus options: "Released Bail", "Pre-Trial Release (Non-Bail)", "House Arrest", "ROR", "Acquitted", "Drop Charges", "Probation", "Parole", "Community Supervision", "Work Release", "Other Released" I need to get the total counts for all of them
    this.releasedCount = this.copyBookings.filter(b => b.custodyStatus == 'Released Bail' || b.custodyStatus == 'Pre-Trial Release (Non-Bail)' || b.custodyStatus == 'House Arrest' || b.custodyStatus == 'ROR' || b.custodyStatus == 'Acquitted' || b.custodyStatus == 'Drop Charges' || b.custodyStatus == 'Probation' || b.custodyStatus == 'Parole' || b.custodyStatus == 'Community Supervision' || b.custodyStatus == 'Work Release' || b.custodyStatus == 'Other Released').length;
  }

  showLate() {
    this.activeBookings = this.lateChecks;
  }

  doCustodyChange(booking: Booking) {
    // console.log('booking', booking);
    const firstname = booking.firstName ? booking.firstName : ''; // Check if the firstname is null or undefined and if so, set it to an empty string
    const lastname = booking.lastName ? booking.lastName : ''; // Check if the lastname is null or undefined and if so, set it to an empty string
    const middleName = booking.middleName ? booking.middleName : ''; // Check if the middleName is null or undefined and if so, set it to an empty string
    const fullName = firstname + ' ' + middleName + ' ' + lastname; // Combine the firstname, middleName, and lastname into a single string
    // Open a SWAL dislog with a select box to change the custody status of the selected booking and then update the booking in the firestore database called 'magistrateBookings'
    Swal.fire({
      title: 'Change Custody Status',
      html: `
    <select id="custody-select" class="swal2-input">
      <optgroup label="In Custody Options">
        <option value="In Holding">In Holding</option>
        <option value="BDOCS">Remanded to BDOCS</option>
        <option value="Convicted">Convicted</option>
        <option value="Awaiting Trial">Awaiting Trial / Pre-Trial</option>
        <option value="Immigration Hold">Immigration Detainer / ICE Hold</option>
        <option value="Pending Sentencing">Pending Sentencing</option>
        <option value="Pending Appeal">Pending Appeal</option>
        <option value="Transferred">Transferred / Extradited</option>
        <option value="Other Held">Other - Held</option>
        <option value="Police Custody">Police Custody / Detention at a Police Station</option>
        <option value="Protective Custody">Protective Custody</option>
        <option value="Juvenile Detention">Juvenile Detention / Held at a Juvenile Facility</option>
        <option value="Psychiatric Hold">Hospital or Psychiatric Hold (Forensic or Secure Medical Facility)</option>
      </optgroup>
      <optgroup label="Released Options">
        <option value="Released Bail">Released on Bail</option>
        <option value="Pre-Trial Release (Non-Bail)">Pre-Trial Release (Non-Bail)</option>
        <option value="House Arrest">House Arrest / Electronic Monitoring</option>
        <option value="ROR">ROR</option>
        <option value="Acquitted">Acquitted</option>
        <option value="Drop Charges">Charges Dropped - Dismissed</option>
        <option value="Probation">Probation</option>
        <option value="Parole">Parole</option>
        <option value="Community Supervision">Community Supervision / Community Corrections Program</option>
        <option value="Work Release">Work Release / Furlough</option>
        <option value="Other Released">Other - Released</option>
      </optgroup>
    </select>
  `,
      width: 700,
      showCancelButton: true,
      confirmButtonText: 'Change Status',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      preConfirm: () => {
        const selectElement = document.getElementById('custody-select') as HTMLSelectElement;
        return selectElement.value;
      }
    }).then((result) => {
      if (result.value) {
        this.af.collection('magistrateBookings').doc(booking.id).update({ custodyStatus: result.value });

        this.af.collection('BookingEvents').add({
          bookingID: booking.id,
          offenderName: fullName,
          type: 'Custody',
          title: 'Custody Status Changed',
          description: 'Custody status changed to ' + result.value + ' by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString(),
          date: new Date().toISOString(),
          unixDate: new Date().getTime().toString(),
          status: result.value,
          comment: 'This record was updated by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString() + ' and the custody status was changed to ' + result.value,
        }).then((docRef) => {
          this.subscriptions.push(this.af.collection('magistrateBookings', ref => ref.where('bookingStatus', '==', 'Open')).valueChanges().subscribe((data: Booking[]) => {
            this.copyBookings = data;
            this.activeBookings = data;
          }));
          Swal.fire(
            'Custody Status Changed',
            'The custody status has been changed and a log entry created.',
            'success'
          );
        }).catch((error) => {
          Swal.fire(
            'Error',
            'There was an error updating the custody status. Please try again.',
            'error'
          );
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire(
          'Custody Status Not Changed',
          'The custody status has not been changed',
          'error'
        );
      }
    });
  }

  doReopenBooking(booking: Booking) {
    // Create a Swal Dialog to confirm the reopening of the booking and if confirmed, update the booking in the firestore database called 'magistrateBookings'
    Swal.fire({
      title: 'Reopen Booking?',
      text: 'Are you sure you want to reopen this booking?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reopen Booking',
      cancelButtonText: 'No, Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.af.collection('magistrateBookings').doc(booking.id).update({bookingStatus: 'Open'});
        // Create an event in the database called BookingEvents with the event type of 'Booking Reopened' and the event description of the booking ID
        this.af.collection('bookingEvents').add({
          offenderID: booking.offenderID,
          bookingID: booking.id,
          type: 'Reopened',
          title: 'Booking Reopened',
          description: 'Reopened by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString(),
          date: new Date().toISOString(),
          unixDate: new Date().getTime().toString(),
          hearingDateSet: '',
          disposition: '',
          status: 'Open',
          comment: 'This record was reopened by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString() + ' and is now open for further processing.',
          approved: false,
          denied: false,
          magistrateEmailed: false
        }).then((docRef) => {
          Swal.fire(
            'Booking Reopened',
            'The booking has been reopened and a log entry created.',
            'success'
          );
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire(
          'Booking Not Reopened',
          'The booking has not been reopened',
          'error'
        );
      }
    });
  }

  doCloseBooking(booking: Booking) {
    Swal.fire({
      title: 'Reauthentication Needed',
      html: '<div class="text-danger font-weight-bold">THIS IS A SECURED FEATURE</div><br>Please re-enter your password to continue<br><input type="password" id="password" class="swal2-input" placeholder="Enter your password">',
      showCancelButton: true,
      confirmButtonText: 'Reauthenticate',
      showLoaderOnConfirm: true,

      preConfirm: () => {
        // Get the password from the input field
        const password = (document.getElementById('password') as HTMLInputElement).value;
        return password;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // console.log('Password', result);
        // Reauthenticate the user using the email and password
        reauthenticateWithCredential(this.user, firebase.auth.EmailAuthProvider.credential(this.user.email, result.value)).then(() => {
          //console.log('Reauthenticated');

          // open a SWAL alert dialog to confirm the deletion of the booking and if confirmed, delete the booking from the firestore database called 'magistrateBookings'
          Swal.fire({
            title: 'Close Booking?',
            text: 'Are you sure you want to close this booking?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Close Booking',
            cancelButtonText: 'No, Cancel',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              this.af.collection('magistrateBookings').doc(booking.id).update({bookingStatus: 'Closed'});
              // Create an event in the database called BookingEvents with the event type of 'Booking Deleted' and the event description of the booking ID
              this.af.collection('bookingEvents').doc().set({
                offenderID: booking.offenderID,
                bookingID: booking.id,
                type: 'Closed',
                title: 'Booking Closed',
                description: 'Closed by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString(),
                date: new Date().toISOString(),
                unixDate: new Date().getTime().toString(),
                hearingDateSet: '',
                disposition: '',
                status: 'Close',
                comment: 'This record was closed by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString() + ' and is set for deletion.',
                approved: false,
                denied: false,
                magistrateEmailed: false
              }).then((docRef) => {
                Swal.fire(
                  'Booking Closed',
                  'The booking has been closed and a log entry created.',
                  'success'
                );
              });
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              Swal.fire(
                'Booking Not Closed',
                'The booking has not been Closed.',
                'error'
              );
            }
          });
        }).catch((error) => {
          // Create a Swal message letting the user know the booking event was not saved successfully
          Swal.fire({
            title: 'ERROR WITH YOUR PASSWORD',
            text: 'Your password was incorrect',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        });
      }
    });
  }

  doDeleteBooking(booking: Booking) {
    Swal.fire({
      title: 'Reauthentication Needed',
      html: '<div class="text-danger font-weight-bold">THIS IS A SECURED FEATURE</div><br>Please re-enter your password to continue<br><input type="password" id="password" class="swal2-input" placeholder="Enter your password">',
      showCancelButton: true,
      confirmButtonText: 'Reauthenticate',
      showLoaderOnConfirm: true,

      preConfirm: () => {
        // Get the password from the input field
        const password = (document.getElementById('password') as HTMLInputElement).value;
        return password;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // console.log('Password', result);
        // Reauthenticate the user using the email and password
        reauthenticateWithCredential(this.user, firebase.auth.EmailAuthProvider.credential(this.user.email, result.value)).then(() => {
          //console.log('Reauthenticated');

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
              this.af.collection('magistrateBookings').doc(booking.id).update({bookingStatus: 'Deleted'});
              // Create an event in the database called BookingEvents with the event type of 'Booking Deleted' and the event description of the booking ID
              this.af.collection('bookingEvents').add({
                offenderID: booking.offenderID,
                bookingID: booking.id,
                type: 'Deleted',
                title: 'Booking Closed and set for Deletion',
                description: 'Deleted by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString(),
                date: new Date().toISOString(),
                unixDate: new Date().getTime().toString(),
                hearingDateSet: '',
                disposition: '',
                status: 'Deleted',
                judge: booking.judge,
                judgeID: booking.judgeID,
                comment: 'This record was deleted by ' + this.currentMember.name + ' (' + this.currentMember.id + ') at ' + new Date().toLocaleString() + ' and is set for deletion.',
                approved: false,
                denied: false,
                magistrateEmailed: false
              });


              Swal.fire(
                'Booking Deleted',
                'The booking has been marked for Deletion and a log entry created.',
                'success'
              );
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              Swal.fire(
                'Booking Not Deleted',
                'The booking has not been deleted',
                'error'
              );
            }
          });
        }).catch((error) => {
          // Create a Swal message letting the user know the booking event was not saved successfully
          Swal.fire({
            title: 'ERROR WITH YOUR PASSWORD',
            text: 'Your password was incorrect',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        });
      }
    });
  }

//   async createReport(booking: Booking) {
//     try {
//       // Show loading indicator
//       Swal.fire({
//         title: 'Generating Report',
//         text: 'Please wait while the report is being generated...',
//         allowOutsideClick: false,
//         didOpen: () => {
//           Swal.showLoading();
//         }
//       });
//
//       // Step 1: Fetch booking record from Firestore
//       const bookingRecord: DocumentSnapshot<Booking> = await this.fs
//         .collection('magistrateBookings')
//         .doc(booking.id)
//         .get()
//         .toPromise() as DocumentSnapshot<Booking>;
//
//       if (!bookingRecord.exists) {
//         throw new Error('Booking record not found');
//       }
//
//       const bookingData: Booking = bookingRecord.data();
//       const afisID = bookingData?.afisID;
//       const name = bookingData?.lastName + ', ' + bookingData?.firstName + ' ' + bookingData?.middleName;
//
//       const additionalNotes: string[] = [];
//       let kioskCheckInData: any[] = [];
//       let kioskLogsData: any[] = [];
//       let kioskNameData: any[] = [];
//
//       // Handle missing AFIS ID
//       if (!afisID) {
//         additionalNotes.push(
//           'The offender has not been fingerprinted or the record has not been linked to the AFIS system. Therefore, no kiosk check-ins are available.'
//         );
//       }
//
//       // Step 2: Fetch kiosk log-ins related to this AFIS ID (if available)
//       if (afisID) {
//         const kioskCheckInsSnapshot = await this.fs.collection('kioskCheckIn', ref =>
//           ref.where('afisID', '==', afisID)
//         ).get().toPromise();
//
//         kioskCheckInData = kioskCheckInsSnapshot.docs.map(doc => doc.data());
//       }
//       console.log('kioskCheckInData', kioskCheckInData);
//
//       // Step 3: Fetch kiosk logs related to the AFIS ID
//       const kioskLogsSnapshot = await this.fs.collection('kioskLogs', ref =>
//         ref.where('description', '==', `Fingerprints Found in AFIS with ID: ${afisID}`)
//       ).get().toPromise();
//
//       kioskLogsData = kioskLogsSnapshot.docs.map(doc => doc.data());
//
//
//       // Step 3A: Fetch kiosk logs related to the AFIS ID
//       const kioskNamesSnapshot = await this.fs.collection('kioskLogs', ref =>
//         ref.where('name', '==', `${name}`)
//       ).get().toPromise();
//
//       kioskNameData = kioskNamesSnapshot.docs.map(doc => doc.data());
//
//       // Combine kioskCheckInData, kioskLogsData and kioskNameData into one dataset
//       const allKioskData = [...kioskCheckInData, ...kioskLogsData, ...kioskNameData];
//       if(allKioskData.length === 0) {
//         additionalNotes.push('No kiosk check-ins found for this offender.');
//       }
//       // Sort the records using the unix field showing the oldest first
//       allKioskData.sort((a, b) => (parseInt(a.unix) > parseInt(b.unix)) ? 1 : -1);
//       console.log('Sorted allKioskData', allKioskData);
//
//       // Using the unix timestamp, get the day of the week and add it to the object for each record as "dayOfWeek"
//       allKioskData.forEach((record) => {
//         record.dayOfWeek = new Date(parseInt(record.unix)).toLocaleDateString('en-US', {weekday: 'long'});
//       });
//       console.log('Day of Week added to allKioskData', allKioskData);
//       let checkinDetailsHTML = '';
// try {
//   // Extract days of the week the defendant is supposed to check in
//   const checkinDays: string[] = [];
//   if (bookingData.sundayChecked) checkinDays.push('Sunday');
//   if (bookingData.mondayChecked) checkinDays.push('Monday');
//   if (bookingData.tuesdayChecked) checkinDays.push('Tuesday');
//   if (bookingData.wednesdayChecked) checkinDays.push('Wednesday');
//   if (bookingData.thursdayChecked) checkinDays.push('Thursday');
//   if (bookingData.fridayChecked) checkinDays.push('Friday');
//   if (bookingData.saturdayChecked) checkinDays.push('Saturday');
//   console.log('checkinDays', checkinDays);
//   additionalNotes.push(`The defendant is required to check in on the following days: ${checkinDays.join(', ')}`);
//
// // Get the oldest and newest check-in dates
//   const oldestCheckinDate = new Date(parseInt(allKioskData[0].unix));
//   const newestCheckinDate = new Date(parseInt(allKioskData[allKioskData.length - 1].unix));
//   console.log('oldestCheckinDate', oldestCheckinDate);
//   console.log('newestCheckinDate', newestCheckinDate);
//   additionalNotes.push(`The defendant's first check-in was on ${oldestCheckinDate.toLocaleDateString()} and the most recent check-in was on ${newestCheckinDate.toLocaleDateString()}`);
//
// // Generate all dates between the oldest and newest check-in dates
//   const checkinDates: Date[] = [];
//   for (let d = new Date(oldestCheckinDate); d <= newestCheckinDate; d.setDate(d.getDate() + 1)) {
//     checkinDates.push(new Date(d));
//   }
//   console.log('checkinDates', checkinDates);
//   // Create a new array to hold processed records
//   let processedData: any[] = [];
//
// // Process each calendar date and determine compliance
//   checkinDates.forEach((date) => {
//     const dayOfWeek = date.toLocaleDateString('en-US', {weekday: 'long'});
//     console.log('dayOfWeek', dayOfWeek);
//     const formattedDate = date.toLocaleString('en-US', {
//       month: 'numeric',
//       day: 'numeric',
//       year: 'numeric'
//     });
//     console.log('formattedDate', formattedDate);
//
//     // Check if a record exists for this date
//     const checkinRecord = allKioskData.find((record) => {
//       // Extract and format only the date components from the record's datetime
//       const recordDate = new Date(record.datetime).toLocaleDateString('en-US', {
//         month: 'numeric',
//         day: 'numeric',
//         year: 'numeric',
//       });
//
//       // Extract and format only the date components from formattedDate
//       const formattedDateOnly = new Date(formattedDate).toLocaleDateString('en-US', {
//         month: 'numeric',
//         day: 'numeric',
//         year: 'numeric',
//       });
//
//       return recordDate === formattedDateOnly;
//     });
//     console.log('checkinRecord', checkinRecord);
//     if (checkinRecord) {
//       console.log('Record Exist');
//       // Record exists, check compliance
//       if (checkinDays.includes(dayOfWeek)) {
//         console.log('Compliant');
//         checkinRecord.complianceStatus = 'Compliant';
//         processedData.push(checkinRecord);
//       } else {
//         console.log('Check-in Found, Not Required for This Case');
//         checkinRecord.complianceStatus = 'Check-in Found, Not Required for This Case';
//         processedData.push(checkinRecord);
//       }
//     } else if (checkinDays.includes(dayOfWeek)) {
//       console.log('Non-Compliant - Missed Checkin');
//       // No record exists, but check-in is required
//       processedData.push({
//         afisID: bookingData.afisID,
//         name: `${bookingData.lastName}, ${bookingData.firstName} ${bookingData.middleName || ''}`,
//         datetime: formattedDate,
//         dayOfWeek: dayOfWeek,
//         complianceStatus: 'NON-COMPLIANT - MISSED CHECKIN',
//         location: 'NO CHECKIN FOUND',
//         unix: date.getTime().toString()
//       });
//     }
//   });
//
// // Re-sort the records by unix timestamp (oldest first)
//   processedData.sort((a, b) => parseInt(a.unix) - parseInt(b.unix));
//   console.log('Sorted processedData', processedData);
// // Generate the HTML table for check-in details
//   const checkinDetailsTable = processedData.map((record) => {
//     return `<tr class="${record.complianceStatus === 'Compliant' ? 'compliant' : 'non-compliant'}">
//     <td>${record.datetime}</td>
//     <td>${record.dayOfWeek}</td>
//     <td>${record.complianceStatus}</td>
//     <td>${record.location}</td>
//   </tr>`;
//   }).join('');
//   const compliantCheckins = processedData.filter((record) => record.complianceStatus === 'Compliant').length;
//   const nonCompliantCheckins = processedData.filter((record) => record.complianceStatus !== 'Compliant').length;
//   const totalCheckins = processedData.length;
//
//   additionalNotes.push(`Total Check-ins: ${totalCheckins}, Compliant: ${compliantCheckins}, Non-Compliant: ${nonCompliantCheckins}`);
//
//   const checkinDetailsHTML = `
//   <h4 style="text-align: center">CHECK-IN COMPLIANCE DETAILS</h4>
//   <table border="1" style="width: 100%; border-collapse: collapse;">
//     <thead>
//       <tr>
//         <th>Date & Time</th>
//         <th>Day of Week</th>
//         <th>Compliance Status</th>
//         <th>Location</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${checkinDetailsTable}
//     </tbody>
//   </table>
// `;
// } catch (error) {
//   console.error('Error processing check-in data', error);
//   additionalNotes.push('Error processing check-in data');
//   checkinDetailsHTML = 'No Records where found for this Defendant. He may still be incarcerated';
//
// }
//
//
//       const reportDate = new Date().toLocaleDateString();
//
//     // Step 4: Prepare data for OpenAI
//     const formattedPrompt = `
// Please generate a detailed HTML report based on the following data:
//
// **Booking Record:**
// ${JSON.stringify(bookingData, null, 2)}
//
// **Check-in Compliance Details written in an HTML Table - for Analysis Only**
// **KNOWN CHECK-INS:**
// ${checkinDetailsHTML}
//
//
// **Additional Notes:**
// ${additionalNotes.join('\n')}
//
// ### Requirements:
// - Write full paragraphs for each section, ensuring clear transitions and cohesive analysis.
// - Use a professional tone suitable for judicial review.
// - Only include data from the booking record or additional notes when necessary to support the narrative.
// - Do not list raw key-value pairs or recreate tables in this section.
//
// - Generate the report in structured **HTML** format for official presentation. Use the following layout:
//   - **Global Style**:
//     - Set font size to 12px for all text in the report. Use h4 for highlighting section titles. Do not use amy text size larger that h4 or 14px.
//     - Align all text to the left of the page.
//     - Use tables for structured data with consistent column widths. Make the layout look professional and colorful. Use light and dark grey for alternating rows.
//     - Do not make columns too wide or too narrow. Ensure the report is easy to read and navigate. Keep text from wrapping. Do not center the narratives, keep them left aligned.
//   - **DEFENDANT SUMMARY**:
//     - A 2 column table summarizing:
//       - In Left Column, put the photo of the defendant in an image element with a height of 100px centered. If there is no photo, use "http://localhost:4200/assets/img/users/default-user.jpg" as the image url
//       - In right column, - Write a brief overview of the defendant, including their full name, age, and any relevant background information from the booking record.
//
//   Please generate a professional narrative report based on the following case data. The report should be structured and contain the following sections:
//
// - **CASE DETAILS**:
//   - Provide a cohesive summary of the charges, suretor information, court requirements, comments and additional conditions. Avoid listing data verbatim; instead, interpret the details into a professional narrative.
//
// - **RISK ASSESSMENT**:
//   - Assess the defendant's risk based on the charges, court conditions, and check-in compliance. Identify any potential risks to public safety or risks of non-compliance.
//
// - **COMPLIANCE ANALYSIS**:
//   - Summarize the defendant's check-in behavior. Highlight compliant and non-compliant days, patterns in check-in times and locations, and any missed or additional check-ins. Provide insights on how this affects their overall case.
//   - Provide the length of time since the last check-in and the total number of check-ins to date. Today's date is ${reportDate}.
//   - If the case is still open and the defendant is released on bail, they are required to be checking in on the court ordered days of the week. If the case is closed, the defendant is no longer required to check in.
//
// - **DATE CONTEXT**:
//   - Analyze key dates in the case, such as the booking date, court dates, and check-in dates. Calculate the number of days elapsed since each date and explain their relevance to the case.
//
// Format the report with proper headings for each section and align all text to the left.
//
// - Use professional HTML structure:
//   - Style with inline CSS for clarity. Make all header text h4 and a dark red color
//   - Ensure the report is formatted for judicial review and give the report as a professional states attorney.
//   - Use the following style for the report:
//   <style>
//     table {
//   font-family: Arial, sans-serif;
//     font-size: 12px !important;
//     color: #333;
//     width: 100%;
//     border-collapse: collapse;
//     margin: 20px 0;
//   }
//   th, td {
//     border: 1px solid #ddd;
//     padding: 8px;
//   }
//   td {
//   text-align: left;
//   }
//   th {
//     font-size: 14px !important;
//     background-color: #f4f4f4;
//     font-weight: bold;
//     text-align: center;
//   }
//   tr:nth-child(even) {
//     background-color: lightgrey;
//   }
//   tr:nth-child(odd) {
//     background-color: darkgrey;
//   }
//   .compliant {
//     background-color: #d4edda;
//     color: #155724;
//   }
//   .non-compliant {
//     background-color: #f8d7da;
//     color: #721c24;
//   }
// </style>
// `;
//
//     console.log('formattedPrompt', formattedPrompt);
//
//     // Step 5: Send to OpenAI API
//     const response = await this.http.post('https://api.openai.com/v1/chat/completions', {
//       model: 'gpt-3.5-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: 'You are a professional states attorney providing a case report for the judiciary working for the Magistrate Court in Nassau, The Bahamas. This is an official report.'
//         },
//         {role: 'user', content: formattedPrompt}
//       ],
//       temperature: 0.3,
//       max_tokens: 2000
//     }, {
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer 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`
//       }
//     }).toPromise();
//
//     let generatedReport = response['choices'][0]?.message?.content;
//
//     if (!generatedReport) {
//       throw new Error('No report generated by OpenAI');
//     }
//
//     const styles = `
//     <style>
//     table {
//   font-family: Arial, sans-serif;
//     font-size: 12px !important;
//     color: #333;
//     width: 100%;
//     border-collapse: collapse;
//     margin: 20px 0;
//   }
//   th, td {
//     border: 1px solid #ddd;
//     padding: 8px;
//   }
//   td {
//   text-align: left;
//   }
//   th {
//     font-size: 14px !important;
//     background-color: #f4f4f4;
//     font-weight: bold;
//     text-align: center;
//   }
//   tr:nth-child(even) {
//     background-color: lightgrey;
//   }
//   tr:nth-child(odd) {
//     background-color: darkgrey;
//   }
//   .compliant {
//     background-color: #d4edda;
//     color: #155724;
//   }
//   .non-compliant {
//     background-color: #f8d7da;
//     color: #721c24;
//   }
// </style>`
//
//       if (generatedReport.startsWith('```html')) {
//         generatedReport = generatedReport.replace(/^```html/, '').replace(/```$/, '').trim();
//       }
// const warning = `<div class="mt-4 alert alert-warning small text-center text-warning" role="alert">THIS REPORT GENERATED USING ARTIFICIAL INTELLIGENCE. AI CAN BE WRONG OR INACCURATE. PLEASE CHECK FOR ACCURACY</div>`
//     // Step 5: Display the HTML report in SweetAlert
//     Swal.fire({
//       title: 'MAGISTRATE COURT CASE REPORT',
//       html: generatedReport + warning, // OpenAI will provide the HTML report
//       width: '800px',
//       showConfirmButton: true,
//       confirmButtonText: 'Close',
//       customClass: {
//         popup: 'swal-wide' // Optional, customize the width further
//       }
//     });
//
//   }
//
//   catch(error: any) {
//     // Handle errors
//     if (error.status === 404) {
//       Swal.fire({
//         title: 'Error',
//         text: 'API endpoint not found. Please check the URL.',
//         icon: 'error',
//         confirmButtonText: 'OK'
//       });
//     } else if (error.status === 401) {
//       Swal.fire({
//         title: 'Unauthorized',
//         text: 'Invalid OpenAI API key. Please verify your credentials.',
//         icon: 'error',
//         confirmButtonText: 'OK'
//       });
//     } else {
//       Swal.fire({
//         title: 'Error',
//         text: error.message || 'An unknown error occurred.',
//         icon: 'error',
//         confirmButtonText: 'OK'
//       });
//     }
//   }
// }


  async createReport(booking: Booking) {
    try {
      // Show loading indicator
      Swal.fire({
        title: 'Generating Report',
        text: 'Please wait while the report is being generated... This report is being created using Artificial Intelligence using the OpenAI Platform and may take a few seconds to complete.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Step 1: Fetch booking record from Firestore
      const bookingRecord: DocumentSnapshot<Booking> = await this.fs
        .collection('magistrateBookings')
        .doc(booking.id)
        .get()
        .toPromise() as DocumentSnapshot<Booking>;

      if (!bookingRecord.exists) {
        throw new Error('Booking record not found');
      }

      const bookingData: Booking = bookingRecord.data();
      const afisID = bookingData?.afisID;
      const name = `${bookingData?.lastName}, ${bookingData?.firstName} ${bookingData?.middleName || ''}`;
      const dob = bookingData?.dob;

      const additionalNotes: string[] = [];
      let kioskCheckInData: any[] = [];
      let kioskLogsData: any[] = [];
      let kioskNameData: any[] = [];
      let additionalCasesData: any[] = [];

      // Handle missing AFIS ID
      if (!afisID) {
        additionalNotes.push(
          'The offender has not been fingerprinted or the record has not been linked to the AFIS system. Therefore, no kiosk check-ins are available.'
        );
      }

      // Step 2: Fetch kiosk log-ins related to this AFIS ID (if available)
      try {
        if (afisID) {
          const kioskCheckInsSnapshot = await this.fs.collection('kioskCheckIn', ref =>
            ref.where('afisID', '==', afisID)
          ).get().toPromise();

          kioskCheckInData = kioskCheckInsSnapshot.docs.map(doc => doc.data());
        }
      } catch (error) {
        console.warn('Error fetching kiosk check-in data:', error);
        additionalNotes.push('Error occurred while fetching kiosk check-in data.');
      }
      console.log('kioskCheckInData', kioskCheckInData);



      // Step 3: Fetch kiosk logs related to the AFIS ID
      try {
        const kioskLogsSnapshot = await this.fs.collection('kioskLogs', ref =>
          ref.where('description', '==', `Fingerprints Found in AFIS with ID: ${afisID}`)
        ).get().toPromise();

        kioskLogsData = kioskLogsSnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.warn('Error fetching kiosk logs:', error);
        additionalNotes.push('Error occurred while fetching kiosk logs.');
      }
      console.log('kioskLogsData', kioskLogsData);



      // Step 4: Fetch kiosk logs by name
      try {
        const kioskNamesSnapshot = await this.fs.collection('kioskLogs', ref =>
          ref.where('name', '==', `${name}`)
        ).get().toPromise();

        kioskNameData = kioskNamesSnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.warn('Error fetching kiosk logs by name:', error);
        additionalNotes.push('Error occurred while fetching kiosk logs by name.');
      }

      console.log('kioskNameData', kioskNameData);


      // Combine kiosk data into one dataset
      const allKioskData = [...kioskCheckInData, ...kioskLogsData, ...kioskNameData];
      if (allKioskData.length === 0) {
        additionalNotes.push('No kiosk check-ins found for this offender.');
      }

      console.log('allKioskData', allKioskData);

      // Process compliance and check-in details if there is data
      let checkinDetailsHTML = '';
      if (allKioskData.length > 0) {
        try {
          // Extract days of the week the defendant is supposed to check in
          const checkinDays: string[] = [];
          if (bookingData.sundayChecked) checkinDays.push('Sunday');
          if (bookingData.mondayChecked) checkinDays.push('Monday');
          if (bookingData.tuesdayChecked) checkinDays.push('Tuesday');
          if (bookingData.wednesdayChecked) checkinDays.push('Wednesday');
          if (bookingData.thursdayChecked) checkinDays.push('Thursday');
          if (bookingData.fridayChecked) checkinDays.push('Friday');
          if (bookingData.saturdayChecked) checkinDays.push('Saturday');
          additionalNotes.push(`The defendant is required to check in on the following days: ${checkinDays.join(', ')}`);
          // Sort the records in allKioskData by unix timestamp (oldest first)
          allKioskData.sort((a, b) => parseInt(a.unix) - parseInt(b.unix));
          // Get the oldest and newest check-in dates
          const oldestCheckinDate = new Date(parseInt(allKioskData[0].unix));
          const newestCheckinDate = new Date(parseInt(allKioskData[allKioskData.length - 1].unix));
          additionalNotes.push(`The defendant's first check-in was on ${oldestCheckinDate.toLocaleDateString()} and the most recent check-in was on ${newestCheckinDate.toLocaleDateString()}`);

          // Generate all dates between the oldest and newest check-in dates
          const checkinDates: Date[] = [];
          for (let d = new Date(oldestCheckinDate); d <= newestCheckinDate; d.setDate(d.getDate() + 1)) {
            checkinDates.push(new Date(d));
          }
          console.log('checkinDates', checkinDates);
          // Loop[ through each record in allKioskData and add the day of the week to the object as "dayOfWeek"
          allKioskData.forEach((record) => {
            record.dayOfWeek = new Date(parseInt(record.unix)).toLocaleDateString('en-US', {weekday: 'long'});
          });

          console.log('checkinDates', checkinDates);
          // Create a new array to hold processed records
          let processedData: any[] = [];

          // Process each calendar date and determine compliance
          checkinDates.forEach((date) => {
            const dayOfWeek = date.toLocaleDateString('en-US', {weekday: 'long'});
            const formattedDate = date.toLocaleString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            });

            // Check if a record exists for this date
            const checkinRecord = allKioskData.find((record) => {
              const recordDate = new Date(record.datetime).toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
              });
              return recordDate === formattedDate;
            });

            if (checkinRecord) {
              console.log('Record Exist', checkinRecord);
              // Record exists, check compliance
              if (checkinDays.includes(dayOfWeek)) {
                checkinRecord.complianceStatus = 'Compliant';
                processedData.push(checkinRecord);
              } else {
                checkinRecord.complianceStatus = 'Check-in Found, Not Required for This Case';
                processedData.push(checkinRecord);
              }
            } else if (checkinDays.includes(dayOfWeek)) {
              // No record exists, but check-in is required
              processedData.push({
                afisID: bookingData.afisID,
                name: `${bookingData.lastName}, ${bookingData.firstName} ${bookingData.middleName || ''}`,
                datetime: formattedDate,
                dayOfWeek: dayOfWeek,
                complianceStatus: 'NON-COMPLIANT - MISSED CHECKIN',
                location: 'NO CHECKIN FOUND',
                unix: date.getTime().toString()
              });
            }
          });

          // Re-sort the records by unix timestamp (oldest first)
          processedData.sort((a, b) => parseInt(a.unix) - parseInt(b.unix));
          console.log('Sorted processedData', processedData);
          // Generate the HTML table for check-in details
          const checkinDetailsTable = processedData.map((record) => {
            return `<tr class="${record.complianceStatus === 'Compliant' ? 'compliant' : 'non-compliant'}">
            <td>${record.datetime}</td>
            <td>${record.dayOfWeek}</td>
            <td>${record.complianceStatus}</td>
            <td>${record.location}</td>
          </tr>`;
          }).join('');
          console.log('checkinDetailsTable', checkinDetailsTable);
          const compliantCheckins = processedData.filter((record) => record.complianceStatus === 'Compliant').length;
          const nonCompliantCheckins = processedData.filter((record) => record.complianceStatus !== 'Compliant').length;
          const totalCheckins = processedData.length;

          additionalNotes.push(`Total Check-ins: ${totalCheckins}, Compliant: ${compliantCheckins}, Non-Compliant: ${nonCompliantCheckins}`);

          checkinDetailsHTML = `
          <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Day of Week</th>
                <th>Compliance Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${checkinDetailsTable}
            </tbody>
          </table>
        `;
        } catch (error) {
          console.warn('Error processing check-in compliance:', error);
          additionalNotes.push('Error processing check-in compliance.');
          checkinDetailsHTML = '<p>No Records found for this Defendant. He may still be incarcerated.</p>';
        }
      } else {
        checkinDetailsHTML = '<p>No check-ins found for this defendant.</p>';
      }
      console.log('checkinDetailsHTML', checkinDetailsHTML);

      // Step 5: Fetch additional cases using name and date of birth
      try {
        console.log("bookingData", bookingData);
        const additionalCasesSnapshot = await this.fs.collection('magistrateBookings', ref =>
          ref.where('lastName', '==', bookingData.lastName)
            .where('firstName', '==', bookingData.firstName)
            .where('dob', '==', bookingData.dob)
        ).get().toPromise();

        additionalCasesData = additionalCasesSnapshot.docs.map(doc => doc.data());
        // Check to see if the current booking is in the additional cases data and remove it
        additionalCasesData = additionalCasesData.filter((record) => record.id !== booking.id);
        console.log('additionalCasesData', additionalCasesData);



        if (additionalCasesData.length > 0) {
          additionalNotes.push(`${additionalCasesData.length} additional case(s) were found for this defendant.`);
        } else {
          additionalNotes.push('No additional cases were found for this defendant.');
        }
      } catch (error) {
        console.warn('Error fetching additional cases:', error);
        additionalNotes.push('Error occurred while fetching additional cases.');
      }

      // Generate OpenAI prompt
      const reportDate = new Date().toLocaleDateString();
      const formattedPrompt = `
Please generate a detailed HTML report based on the following data:

**Booking Record:**
${JSON.stringify(bookingData, null, 2)}

**Check-in Compliance Details written in an HTML Table - for Analysis Only**
**KNOWN CHECK-INS:**
${checkinDetailsHTML}

**Additional Cases Found:**
${JSON.stringify(additionalCasesData, null, 2)}


**Additional Notes:**
${additionalNotes.join('\n')}

### Requirements:
- Write full paragraphs for each section, ensuring clear transitions and cohesive analysis.
- Use a professional tone suitable for judicial review.
- Only include data from the booking record or additional notes when necessary to support the narrative.
- Do not list raw key-value pairs or recreate tables in this section.

- Generate the report in structured **HTML** format for official presentation. Use the following layout:
  - **Global Style**:
    - Set font size to 12px for all text in the report. Use h4 for highlighting section titles. Do not use amy text size larger that h4 or 14px.
    - Align all text to the left of the page.
    - Use tables for structured data with consistent column widths. Make the layout look professional and colorful. Use light and dark grey for alternating rows.
    - Do not make columns too wide or too narrow. Ensure the report is easy to read and navigate. Keep text from wrapping. Do not center the narratives, keep them left aligned.
  - **DEFENDANT SUMMARY**:
    - A 2 column table summarizing:
      - In Left Column, put the photo of the defendant in an image element with a height of 150px centered. If there is no photo, use "http://localhost:4200/assets/img/users/default-user.jpg" as the image url
      - In right column, - Write a brief overview of the defendant, including their full name, age, address, court and judge assigned and any relevant background information from the booking record.

  Please generate a professional narrative report based on the following case data. The report should be structured and contain the following sections:

- **CASE DETAILS**:
  - Provide a cohesive summary of the charges, suretor information, court requirements, comments and additional conditions. Avoid listing data verbatim; instead, interpret the details into a professional narrative.
  - Take into account any additional cases found and summarize them in a cohesive manner.
- **ADDITIONAL CASE(S)**:
  - Provide a cohesive summary of the charges, suretor information, court requirements, comments and additional conditions. Avoid listing data verbatim; instead, interpret the details into a professional narrative.
  - Combine all additional cases into one narrative. Provide any differences or similarities between the cases.
- **RISK ASSESSMENT**:
  - Assess the defendant's risk based on the charges, court conditions, any additional cases and check-in compliance. Identify any potential risks to public safety or risks of non-compliance.
- **COMPLIANCE ANALYSIS**:
  - Summarize the defendant's check-in behavior. Highlight compliant and non-compliant days, patterns in check-in times and locations, and any missed or additional check-ins. Provide insights on how this affects their overall case.
  - Provide the length of time since the last check-in and the total number of check-ins to date. Today's date is ${reportDate}. Take into account the checkin days from additional cases that may have been found
  - If the case is still open and the defendant is released on bail, they are required to be checking in on the court ordered days of the week. If the case is closed, the defendant is no longer required to check in.
  - Provide the length of time since the last check-in.

- **DATE CONTEXT**:
  - Show the age of the case, the number of days since the booking date, the number of days since the last check-in and the number of days since the last court date or till the next court date.

- **CHECK-IN ANALYSIS**:
  - Use the table given in the prompt ONLY for analysis and not for the final report. Do not include the table in the final report.
  - Write a narrative based on the check-in data provided.
  - Include the total number of check-ins, compliant and non-compliant check-ins, and any additional insights you can provide from the provided data.

Format the report with proper headings for each section and align all text to the left.

- Use professional HTML structure:
  - Style with inline CSS for clarity. Make all header text h4 and a dark red color
  - Ensure the report is formatted for judicial review and give the report as a professional states attorney.
  - Use the following style for the report:
  <style>
    table {
  font-family: Arial, sans-serif;
    font-size: 12px !important;
    color: #333;
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  td {
  text-align: left;
  }
  th {
    font-size: 14px !important;
    background-color: #f4f4f4;
    font-weight: bold;
    text-align: center;
  }
  tr:nth-child(even) {
    background-color: lightgrey;
  }
  tr:nth-child(odd) {
    background-color: darkgrey;
  }
  .compliant {
    background-color: #d4edda;
    color: #155724;
  }
  .non-compliant {
    background-color: #f8d7da;
    color: #721c24;
  }
</style>
`;

      // Send to OpenAI API
      const response = await this.http.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional states attorney providing a case report for the judiciary working for the Magistrate Court in Nassau, The Bahamas. This is an official report.'
          },
          {role: 'user', content: formattedPrompt}
        ],
        temperature: 0.3,
        max_tokens: 2000
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer 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`
        }
      }).toPromise();

      let generatedReport = response['choices'][0]?.message?.content;

      if (!generatedReport) {
        throw new Error('No report generated by OpenAI');
      }

      if (generatedReport.startsWith('```html')) {
        generatedReport = generatedReport.replace(/^```html/, '').replace(/```$/, '').trim();
      }

      const warning = `<div class="mt-4 alert alert-danger small text-center text-dark" style="font-size: 10px" role="alert">THIS REPORT GENERATED USING ARTIFICIAL INTELLIGENCE.<br>PLEASE CHECK FOR ACCURACY</div>`;

      // Step 6: Display the HTML report in SweetAlert
      Swal.fire({
        title: 'MAGISTRATE COURT CASE REPORT',
        html: generatedReport + checkinDetailsHTML +  warning,
        width: '800px',
        showConfirmButton: true,
        confirmButtonText: 'Close',
        customClass: {
          popup: 'swal-wide'
        }
      });

    } catch (error: any) {
      console.error('Error generating report:', error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'An unknown error occurred.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }


  getAge(age
:
string | number
)
{
  // get the current age in years from the age provided as a string or number in the format of 'YYYY-MM-DD'
  const today = new Date();
  const birthDate = new Date(age);
  let ageYears = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    ageYears--;
  }
  return ageYears;
}

humanizeDate(unixDate
:
string
)
{
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
convertUnixDate(unixDate
:
string
)
{
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

  const month = date.toLocaleString('en-US', {month: 'long'});
  const day = date.getDate();
  const year = date.getFullYear();
  let hour = date.getHours();
  const minute = date.getMinutes();

  const amOrPm = hour < 12 ? 'AM' : 'PM';
  hour = hour % 12 || 12; // Convert hour to 12-hour format

  const formattedDate = `${month} ${day}, ${year} ${hour}:${minute.toString().padStart(2, '0')} ${amOrPm}`;

  return formattedDate;
}

getPhoto()
{
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

doSelect(book
:
Booking
)
{
  this.selectedBooking = book;
  this.showSearch = false;
  this.showBooking = true;
}

createBooking()
{
  this.showBooking = true;
  this.showHearing = false;
  this.showSearch = false;
}

doSuretorReport()
{
  this.showSuretor = true;
  this.showSearch = false;
}

closeHearing($event)
{
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

ngOnDestroy()
:
void {
  // Go through all subscriptions and unsubscribe
  for(let i = 0; i < this.subscriptions.length; i++
)
{
  this.subscriptions[i].unsubscribe();
}
}
}
