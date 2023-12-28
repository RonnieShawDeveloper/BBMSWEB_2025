import {Component, OnInit} from '@angular/core';
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

@Component({
  selector: 'app-dpp',
  templateUrl: './dpp.component.html',
  styleUrls: ['./dpp.component.scss']
})
export class DppComponent implements OnInit {
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
  constructor(private bs: BookingService, private hs: HearingServiceService, private router: Router) {
  }
  ngOnInit(): void {
    this.hs.getAllActiveBookings().subscribe(hearings => {

      hearings = hearings.filter(hearing => hearing.judgeID !== undefined && hearing.judgeID !== '');
      hearings = hearings.filter(hearing => hearing.grantBailChecked !== true);
      hearings = hearings.filter(hearing => hearing.deniedBailChecked !== true);
      const lastMonth = moment().subtract(1, 'months').unix();
      hearings = hearings.filter(hearing => parseInt(hearing.hearingDateUnix) >= lastMonth);

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
      this.hearings = hearings.sort((a, b) => (a.hearingDateUnix > b.hearingDateUnix) ? -1 : 1);
      this.hearingsCopy = this.hearings;
      this.totalHearings = this.hearings.length;
      // Get the number of pending hearings using the hearingDateUnix property that are in the future from the current time
      this.pendingHearings = this.hearings.filter(hearing => parseInt(hearing.hearingDateUnix) > Date.now()).length;

      this.newHearings = this.hearings.filter(hearing => hearing.registrarAck == false).length;
      this.grantedHearings = this.hearings.filter(hearing => hearing.grantBailChecked == true).length;
      this.deniedHearings = this.hearings.filter(hearing => hearing.deniedBailChecked == true).length;
      this.rorHearings = this.hearings.filter(hearing => hearing.releaseOnRecognizance == true).length;
      this.bondsIssued = this.hearings.filter(hearing => hearing.bailBondIssueDateUnix != null && hearing.bailBondIssueDateUnix != undefined && hearing.bailBondIssueDateUnix != "").length;

      if(!this.firstView) {
        // Create a swal alert to show the user that the data has been updated
        Swal.fire({
          toast: true,
          position: 'top-right',
          title: 'Hearings Updated',
          text: 'New Hearings have been added or updated.',
          icon: 'success',
          timerProgressBar: true,
          showConfirmButton: false,
          timer: 5000,
        });
      }
      this.firstView = false;
    });
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

  cancelBailAppTable(event) {
    this.showMainTable = true;
    this.showBailAppTable = false;
    this.selectedHearing = null;
  }

  clear(table: Table) {
    table.clear();
  }

}
