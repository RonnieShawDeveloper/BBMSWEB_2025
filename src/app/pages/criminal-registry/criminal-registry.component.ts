import {Component, OnDestroy, OnInit} from '@angular/core';
import {Booking} from "../../models/booking";
import {BookingService} from "../../services/booking.service";
import {BookingEvents} from "../../models/events";
import {HearingServiceService} from "../../services/hearing-service.service";
import {Hearings} from "../../models/hearings";
import {Table} from "primeng/table";
import {take} from "rxjs";
import {Router} from "@angular/router";
import Swal from "sweetalert2";
import * as moment from "moment";
import {Count} from "../../models/count";


@Component({
  selector: 'app-criminal-registry',
  templateUrl: './criminal-registry.component.html',
  styleUrls: ['./criminal-registry.component.scss']
})
export class CriminalRegistryComponent implements OnInit, OnDestroy {

  bookings: Booking[] = [];
  bailApps: BookingEvents[] = [];
  hearings: Hearings[] = [];
  hearingsCopy: Hearings[] = [];
  firstView: boolean = true;

  totalHearings: number = 0;
  pendingHearings: number = 0;
  newHearings: number = 0;
  grantedHearings: number = 0;
  deniedHearings: number = 0;
  rorHearings: number = 0;
  bondsIssued: number = 0;

  showMainTable: boolean = true;
  showBailAppTable: boolean = false;
  selectedHearing: Hearings;
  subscriptions: any[] = [];

  constructor(private bs: BookingService, private hs: HearingServiceService, private router: Router) {

  }


  ngOnInit() {
    this.subscriptions.push(this.hs.getAllActiveBookings().subscribe(hearings => {
      hearings.forEach(hearing => {
        // Check offender name for a comma and if exists, remove the comma and reverse the order of the name
        if (hearing.offenderName.includes(",")) {
          const on:String[] = hearing.offenderName.split(",");
          // remove all whitespace from each string in the array
          on.forEach((value, index, array) => {
            array[index] = value.trim();
          });
          // Put the ofender name as First Last
          const offenderName = on[1] + " " + on[0];
          hearing.offenderName = offenderName;
          this.hs.updateHearing(hearing);
        }
        // Check the 'offenderName' property to see if there are more than one spaces and if so, remove all but one space
        if (hearing.offenderName.includes("  ")) {
          hearing.offenderName = hearing.offenderName.replace(/\s+/g, ' ');
          this.hs.updateHearing(hearing);
        }
        // Change the name back to Last, First
        let on:String[] = hearing.offenderName.split(" ");
        let offenderName = on[1] + ", " + on[0];
        hearing.offenderName = offenderName;
        // Get each bail application event for each hearing
        this.bs.getSingleEvent(hearing.eventID).pipe(take(1)).subscribe(bailApp => {
         hearing.bailAppLink = bailApp.link;
         hearing.unixDate = bailApp.unixDate;
        });
      });
      this.hearings = hearings.sort((a, b) => (a.offenderName > b.offenderName) ? 1 : -1);
      this.hearingsCopy = this.hearings;
      this.totalHearings = this.hearings.length;
      // Get the number of pending hearings using the hearingDateUnix property that are in the future from the current time
      this.pendingHearings = this.hearings.filter(hearing => parseInt(hearing.hearingDateUnix) > Date.now()).length;

      this.newHearings = this.hearings.filter(hearing => hearing.registrarAck == false).length;
      this.grantedHearings = this.hearings.filter(hearing => hearing.grantBailChecked == true).length;
      this.deniedHearings = this.hearings.filter(hearing => hearing.deniedBailChecked == true).length;
      this.rorHearings = this.hearings.filter(hearing => hearing.releaseOnRecognizance == true).length;
      this.bondsIssued = this.hearings.filter(hearing => hearing.bailBondIssueDateUnix != null && hearing.bailBondIssueDateUnix != undefined && hearing.bailBondIssueDateUnix != "").length;

    }));
  }

  doBailAgingReport() {
    // Create a Swal alert to let the user know this feature is coming soon
    Swal.fire({
      toast: false,
      title: 'Coming Soon',
      text: 'This feature is coming soon.',
      icon: 'info',
      timerProgressBar: true,
      showConfirmButton: false,
      timer: 3000,
    });
  }

  // Show All Hearings
  showAllHearings() {
    this.hearings = this.hearingsCopy;
  }
  // show all hearings that the registrar has not acknowledged
  showUnacknowledgedHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.registrarAck == false && hearing.grantBailChecked == false && hearing.deniedBailChecked == false);
  }
  // Show all hearings that have not been acknowledged by the registrar and the bail has been granted
  showUpdatedHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.registrarAck == false && hearing.grantBailChecked == true);
  }
  // Show all hearings that have the hearingDateUnix property set for a future date from now
  showPendingHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => parseInt(hearing.hearingDateUnix) > Date.now());
  }
  // show all hearings that have been granted bail
  showGrantedHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.grantBailChecked == true);
  }
  // show all hearings that have been denied bail
  showDeniedHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.deniedBailChecked == true);
  }
  // Show all hearings that the defendant has been released on own recognizance
  showRORHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.releaseOnRecognizance == true);
  }
  // Show all hearings that have a bond issued
  showBondHearings() {
    this.hearings = this.hearingsCopy.filter(hearing => hearing.bailBondIssueDateUnix != null && hearing.bailBondIssueDateUnix != undefined && hearing.bailBondIssueDateUnix != "");
  }

  // Use moment to return a humanized date from a unix timestamp
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

  // Get the URL for the bail app and open the pdf in a new browser window
  openBailApp(bailAppLink: string) {
    window.open(bailAppLink, "_blank");
  }
  doBailAppReport() {
    this.router.navigate(['bailAppReport']);
  }

  doBailKioskCheckin() {
    this.router.navigate(['bailKioskCheckin']);
  }
  doPhoneReport() {
    this.router.navigate(['phonereport']);
  }


  checkHearingDate(hearingDate) {
  // Check to see if hearingDate is in the future and return true if it is
    if (hearingDate == null || hearingDate == undefined) {
      return false;
    }
    let unixTimestamp = parseInt(hearingDate);
    // Convert the unixTimestamp to milliseconds if needed
    if (unixTimestamp.toString().length < 13) {
      unixTimestamp = unixTimestamp * 1000;
    }
    const date = new Date(unixTimestamp);
    const today = new Date();
    if (date > today) {
      return true;
    }
    return false;
  }

  doBailAppTable(hearing: Hearings) {
    this.showMainTable = false;
    this.showBailAppTable = true;
    this.selectedHearing = hearing;
  }

  calcelBailAppTable(event) {
    this.showMainTable = true;
    this.showBailAppTable = false;
    this.selectedHearing = null;
  }

  clear(table: Table) {
    table.clear();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  doResendNotice(hearing) {
    hearing.judgeNewHearingAssignedEmailed = false;
    // Check to see if there in a comma in the offenders name and if so, remove it and put the last name last
    if (hearing.offenderName.includes(',')) {
      const offenderNameArray = hearing.offenderName.split(',');
      hearing.offenderName = offenderNameArray[1].trim() + ' ' + offenderNameArray[0].trim();
    }
    this.hs.updateHearing(hearing);
  }
}
