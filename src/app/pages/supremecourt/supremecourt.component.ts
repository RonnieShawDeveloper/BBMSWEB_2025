import { Component, OnInit, EventEmitter, Output, Input, AfterViewInit } from '@angular/core';
import { HearingServiceService } from '../../services/hearing-service.service';
import { Hearings } from '../../models/hearings';
import * as moment from 'moment';
import { Count } from '../../models/count';
import {BookingService} from '../../services/booking.service';
import {Booking} from '../../models/booking';
import {BookingEvents} from '../../models/events';
import {Photos} from '../../models/photos';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {Offender} from '../../models/offender';
import { HttpClient} from '@angular/common/http';
import {Members} from '../../models/members';
import {AuthService} from '../../services/auth.service';
import {AngularFireStorage, AngularFireStorageReference, AngularFireUploadTask} from "@angular/fire/compat/storage";

import {Observable, take} from 'rxjs';
import {animate, keyframes, style, transition, trigger} from '@angular/animations';
import Swal from "sweetalert2";
import {Router} from "@angular/router";
import {formatDate} from "@angular/common";
import {createEvent, EventAttributes} from "ics";


@Component({
  selector: 'app-judicial',
  templateUrl: './supremecourt.component.html',
  styleUrls: ['./supremecourt.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({opacity: 0, height: 0, overflow: 'hidden'}),
        animate(1000, keyframes([
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
export class SupremecourtComponent implements OnInit {

  // tslint:disable-next-line:no-output-on-prefix
  @Output() onExit = new EventEmitter();

  showHearings = true;
  showAdmin = false;
  showAllBookingsCharges = false;
  orderSigned = false;
  codeIncorrect = false;

  showGrant = false;
  showHold = false;
  showDeny = false;
  showOrder = false;

  allCounts: Count[] = [];
  allHearings: Hearings[] = [];
  activeHearings: Hearings[] = [];
  activeHearingsCopy: Hearings[] = [];
  selectedHearing: Hearings = {};
  selectedBooking: Booking = {};
  selectedEvents: BookingEvents[] = [];
  selectedCounts: Count[] = [];
  selectedBookingEvent: BookingEvents = {};
  selectedPhotos: Photos = {};
  selectedMainPhoto = '/assets/screens/nophoto.jpg?time=' + moment().unix();
  selectedOffender: Offender = {};
  offenderAge = '';
  timeStampCode = '';
  enteredCode = '';
  judgeCount: any[] = [];


  appSubmittedDate = '';

  // Judicial Hearing Admin
  hearingID = '';
  grantBailChecked = false;
  deniedBailChecked = false;
  holdRulingChecked = false;
  bailReportLocation = '';
  bailReportDays = 'NOT SPECIFIED';
  bailReportTime = 'NOT SPECIFIED';
  sundayChecked = false;
  mondayChecked = false;
  tuesdayChecked = false;
  wednesdayChecked = false;
  thursdayChecked = false;
  fridayChecked = false;
  saturdayChecked = false;
  threepmChecked = false;
  fourpmChecked = false;
  fivepmChecked = false;
  sixpmChecked = false;
  sevenpmChecked = false;
  eightpmChecked = false;
  ninepmChecked = false;
  tenpmChecked = false;
  suretyReq = '';
  surrenderPassportChecked = false;
  elecMonitorChecked = false;
  additionalConditions = '';
  judicialNotes = '';
  signatureData = '';

  currentUser: string|void;

  curApps;


  constructor(private router: Router, private as: AuthService, private fs: AngularFirestore, private hs: HearingServiceService, private bs: BookingService, private http: HttpClient, private storage: AngularFireStorage) { }



  ngOnInit(): void {
    // Get all active hearings and put them in the array called activeHearings
    this.hs.getHearings().subscribe((data: Hearings[]) => {
      this.activeHearings = [];
      // Check each hearing in 'data' to see if 'hearingDateSet' contains a value and if it does add it to the array 'activeHearings'
      data.forEach((hearing: Hearings) => {
        if (hearing.hearingDateUnix !== undefined || hearing.hearingDateUnix !== null || hearing.hearingDateUnix !== '') {
          // Give me a Unix Timestamp for the current time - 24 hours
          const yesterday = moment().subtract(2, 'days').unix();
          // Check to see if the hearing date is in the future
          if (parseInt(hearing.hearingDateUnix)/1000 > yesterday || hearing.holdRulingChecked === true) {
            this.activeHearings.push(hearing);
            this.activeHearingsCopy = this.activeHearings;
            this.judgeCount =  this.getJudges();
          }
        }
      });
    });
  }
  // Check if unix timestamp is today and return true or false
  isToday(unixTime: string) {
    // Get a Unix Timestamp for the current time - 6 hours
    const today = moment().subtract(6, 'hours').unix();
    if (parseInt(unixTime)/1000 > today) {
      return true;
    } else {
      return false;
    }
  }

  viewAllHearings() {
    this.activeHearings = this.activeHearingsCopy;
  }

  viewSingleJudgeHearings(judge: string) {
    // get the selected judges name and filter all the hearings to only show the ones with that judge and assign them to the activeHearings array
    this.activeHearings = this.activeHearingsCopy.filter((hearing: Hearings) => {
      return hearing.judgeName === judge;
    });
  }

  getHumanReadableDate(unixTime: string) {
    // Use the moment humanize function to return the duration of time between now and the unix timestamp
    return moment.unix(parseInt(unixTime)/1000).fromNow();
  }

  doHearingSelect(hearing: Hearings) {
    this.selectedHearing = hearing;
    this.showAdmin = true;
    this.showHearings = false;
  }

  async doAddToCalendar(hearing: Hearings) {
    const event: EventAttributes = {
      // Create the start date and time in the format of [year, month, day, hour, minute]
      start: [moment.unix(parseInt(hearing.hearingDateUnix)/1000).year(), moment.unix(parseInt(hearing.hearingDateUnix)/1000).month(), moment.unix(parseInt(hearing.hearingDateUnix)/1000).date(), moment.unix(parseInt(hearing.hearingDateUnix)/1000).hour(), moment.unix(parseInt(hearing.hearingDateUnix)/1000).minute()],
      duration: { hours: 1, minutes: 0 },
      title: 'Bail Hearing for ' + hearing.offenderName,
      description: `You have a Bail Hearing for ${hearing.offenderName} at ${moment(hearing.hearingDateUnix).format('h:mm a')} on ${moment(hearing.hearingDateUnix).format('dddd, MMMM Do YYYY')}.`,
      location: 'The Supreme Court of The Bahamas',
      url: hearing.bailAppLink.toString(),
      geo: { lat: 25.077074, lon: -77.340518 },
      categories: ['Bail Hearings'],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'Criminal Registrar', email: 'bahamas.bail@bahamas.gov.bs' },
      attendees: [
        { name: hearing.judgeName, email: '', rsvp: true, partstat: 'ACCEPTED', role: 'REQ-PARTICIPANT' },
      ]
    }
    const filename = `BAIL-${hearing.offenderName}.ics`;
    const file: Blob|MediaSource = await new Promise((resolve, reject) => {
      createEvent(event, (error, value) => {
        if (error) {
          reject(error)
        }

        resolve(new File([value], filename, { type: 'text/calendar' }))
      })
    })
    const url = URL.createObjectURL(file);
    console.log(url);
    // this.openICSFileInGoogleCalendar(url);

    // trying to assign the file URL to a window could cause cross-site
    // issues so this is a workaround using HTML5

    // window.open(url, '_blank');

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);

  }

  openICSFileInGoogleCalendar(url) {
    var googleCalendarUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE&";
    // var icsFileUrl = encodeURIComponent(url);

    var finalUrl = googleCalendarUrl + "url=" + url;
    window.open(finalUrl, '_blank');
  }

  // Convert Unix Timestamp into a Date and Time string in the local format
  convertUnixTime(unixTime: string) {
    return moment.unix(parseInt(unixTime)/1000).format('MMMM Do YYYY, h:mm:ss A');
  }

 // Create an array of judges from the 'activeHearings' array and count how many times each judge is in the array. Then, return a report of how many ties each judge appears in the array
  getJudges() {
    const judges = [];
    this.activeHearings.forEach((hearing: Hearings) => {
      if (hearing.judgeName !== undefined) {
        judges.push(hearing.judgeName);
      }
    } );
    const counts = {};
    judges.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
    const report = [];
    for (const key in counts) {
      report.push({judge: key, count: counts[key]});
    }
    console.log('Report: ', report);
    return report;
  }
  doHearingAdminExit(event) {
    this.showAdmin = false;
    this.showHearings = true;
  }

  exit() {
    if(this.showAdmin) {
      this.showAdmin = false;
      this.showHearings = true;
    } else {
      // Create a Swal Alert to let user know if they wish to exit they need to use the menu on the left side of the screen
      Swal.fire({
        title: 'Exit?',
        text: 'Are you sure you want to exit? You will return to the System Dashboard',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Exit',
        cancelButtonText: 'No, Stay Here'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/']);
        }
      } );
    }
  }

}
