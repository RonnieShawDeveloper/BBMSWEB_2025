import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Hearings} from "../../../models/hearings";
import {Photos} from "../../../models/photos";
import {HearingServiceService} from "../../../services/hearing-service.service";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Offender} from "../../../models/offender";
import * as moment from 'moment';
import {BookingEvents} from "../../../models/events";
import {BookingService} from "../../../services/booking.service";
import {Booking} from "../../../models/booking";
import Swal from "sweetalert2";
import {Count} from "../../../models/count";

@Component({
  selector: 'app-hearing-admin',
  templateUrl: './hearing-admin.component.html',
  styleUrls: ['./hearing-admin.component.scss']
})
export class HearingAdminComponent implements OnInit{

  @Input() hearing: Hearings = {} as Hearings;
  @Output() onExit = new EventEmitter<boolean>();
  photos: Photos = {} as Photos;
  mainPhoto: string;
  offender: Offender = {} as Offender;
  selectedWeekday: string;
  locations: string;

  showMotions = false;

  bookingEventsArray = [];

  grantedTabIndex = 0;

  counts: Count[] = [];

  holdHearingDate: string;

  constructor(private af: AngularFirestore, private hs: HearingServiceService, private bs: BookingService) {
    Window['HearingAdminComponent'] = this;
  }

  ngOnInit(): void {
    console.log('Hearing: ',this.hearing);
    this.af.collection('users', ref => ref.where('id', '==', this.hearing.offenderID)).valueChanges().subscribe(res => {
      this.offender = res[0] as Offender;
      // Get the photos for the offender
      this.af.collection('photos', ref => ref.where('offenderID', '==', this.offender.spn)).valueChanges().subscribe(res => {
        this.photos = res[0] as Photos;
        // Go through each photo and find the main photo
        this.photos.photos.forEach(photo => {
          if (photo.photoMain === true) {
            this.mainPhoto = photo.photoUrl;
            // Get the image element called 'mainImage' and set the src to the main photo
            const mainImage = document.getElementById('mainImage') as HTMLImageElement;
            mainImage.src = this.mainPhoto;
          } else {
            this.mainPhoto = '/assets/img/users/default-user.jpg';
            // Get the image element called 'mainImage' and set the src to the main photo
            const mainImage = document.getElementById('mainImage') as HTMLImageElement;
            mainImage.src = this.mainPhoto;
          }
        });
      });
    });
  }

  submitNewHearingDate() {
    // convert the holdfhearingdate to a unix timestamp
    const hearingDateUnix = moment(this.holdHearingDate).unix();
    // Create a swal dialog asking if they want to change the hearing date and iof so, update the HearingDateUnix of the current hearing and update the hearing in the database
    Swal.fire({
      title: 'Change Hearing Date',
      text: 'Are you sure you want to change the hearing date to ' + moment(this.holdHearingDate).format('MMMM Do, YYYY hh:mm A') + '?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then((result) => {
      if(result.isConfirmed) {
        this.hearing.hearingDateUnix = (hearingDateUnix*1000).toString();
        this.hearing.holdRulingChecked = true;
        this.hearing.grantBailChecked = false;
        this.hearing.deniedBailChecked = false;
        this.hs.updateHearing(this.hearing);
        // Create a swal dialog letting the user know that the hearing date has been changed
        Swal.fire({
          title: 'Hearing Date Changed',
          text: 'The hearing date has been changed to ' + moment(this.holdHearingDate).format('MMMM Do, YYYY hh:mm A') + '.',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.onExit.emit(true);
        });
      }
    });
  }

  // Convert option to the actual name of the police station and return it
  getPoliceStation(option: string): string {
    console.log('Option: ', option);
    switch (option) {
      case 'any':
        return 'Any Police Station with a Kiosk';
      case 'central':
        return 'Central Police Station (Nassau)';
      case 'cablebeach':
        return 'Cable Beach Police Station';
      case 'southwestern':
        return 'Southwestern Division Police Station';
      case 'eastern':
        return 'Eastern Division Police Station';
      case 'southcentral':
        return 'South Central Division Police Station';
      case 'northeastern':
        return 'Northeastern Division Police Station';
      case 'carmichael':
        return 'Carmichael Division Police Station';
      case 'mobile':
        return 'Mobile Division Police Station';
      case 'ranson':
        return 'Ranson Division Police Station';
      case 'wulff':
        return 'Wulff Road Police Station';
      case 'hawthorne':
        return 'Hawthorne Road Police Station';
      case 'winton':
        return 'Winton Police Station';
      case 'flamingo':
        return 'Flamingo Gardens Police Station';
      case 'englerston':
        return 'Englerston Police Station';
      case 'southbeach':
        return 'South Beach Police Station';
      case 'grove':
        return 'Grove Police Station';
      case 'coralharbour':
        return 'Coral Harbour Police Station';
      case 'rockcrusher':
        return 'Rock Crusher Police Station';
      case 'columbus':
        return 'Columbus Division Police Station';
      case 'elizabeth':
        return 'Elizabeth Police Station';
      case 'freeport':
        return 'Freeport Police Station';
      default:
        return;
    }
  }

  doBailApplication() {
    // Open the BailApplication Link in a new window
    window.open(this.hearing.bailAppLink, '_blank');
  }

  doViewDocument(link) {
    // Open the BailApplication Link in a new window
    window.open(link, '_blank');
  }

  doMotions() {
    // using the bookingID, get all of the booking events that have occured in this matter and put them into an array
    this.af.collection('BookingEvents', ref => ref.where('bookingID', '==', this.hearing.bookingID)).valueChanges().subscribe(res => {
      this.bookingEventsArray = res as BookingEvents[];
      // Sort the array by the 'unixDate'
      this.bookingEventsArray.sort((a, b) => (a.unixDate > b.unixDate) ? 1 : -1);
      this.showMotions = true;
    });
  }

  getNow() {
    return moment().format('Do [day of] MMMM, YYYY [at] h:mm a');
  }

  doViewCharges() {
    // Create a swal modal letting the user know that no charges where entered in this matter
    Swal.fire({
      title: 'No Charges Entered',
      text: 'No charges have been entered in this matter. Please see the Motions/Events tab for the Remand Warrant.',
      icon: 'info',
      confirmButtonText: 'Ok'
    });
  }

  doDenyBail() {
    // Create a swal modal asking if the user is sure they want to deny bail in this matter
    Swal.fire({
      title: 'Deny Bail',
      text: 'Are you sure you want to deny bail in this matter?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then((result) => {
      if(result.isConfirmed) {
        // If the user clicks 'Yes', then set the bail status to 'Denied'
        this.af.collection('hearings').doc(this.hearing.id).update({
          deniedBailChecked: true,
          deniedBailReason: this.hearing.comment,
          registrarAcknowledged: false,
          deniedBailUnixTime: moment().unix().toString(),
          hearingDateUnix: moment().unix().toString(),
        } as Hearings).then(() => {
          // Create a swal modal letting the user know that bail has been denied
          Swal.fire({
            title: 'Bail Denied',
            text: 'Bail has been denied in this matter.',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.onExit.emit(true);
          });
        });
      }
    });
  }

  // Using moment.js, convert the unix timestamp to a readable date
  getReadableDate(unixDate: string) {
    // Convert the unixDate to a number and put it into a variable called 'unixDateNumber'
    let unixDateNumber = Number(unixDate);
    // If the unixDateNumber length = 10, then it is in seconds, so convert it to milliseconds
    if (unixDateNumber.toString().length === 10) {
      unixDateNumber = unixDateNumber * 1000;
    }
    return moment(unixDateNumber).format('Do [day of] MMMM, YYYY [at] h:mm a') + ' (' + moment(unixDateNumber).fromNow() + ')';
  }
  getPoliceStationsNames() {
    console.log('Getting police station names');
    // Get all of the locations that are checked in the document between the div tag with the id of 'locationChecks' and if the checkbox is checked, add it to an array
    const locationChecks = document.getElementById('locationChecks') as HTMLDivElement;
    const locationCheckboxes = locationChecks.getElementsByTagName('input');
    const locationArray = [];
    for (let i = 0; i < locationCheckboxes.length; i++) {
      if (locationCheckboxes[i].checked) {
        locationArray.push(locationCheckboxes[i].value);
      }
    }
    console.log('Location Array: ', locationArray);
    // Using the getPoliceStation function, convert each location in the locationArray to the actual name of the police station
    for (let i = 0; i < locationArray.length; i++) {
      locationArray[i] = this.getPoliceStation(locationArray[i]);
    }
    // Take the locationArray and convert it to a string separated by commas and put the work 'and' before the last item in the array
    const locationString = locationArray.join(', ').replace(/, ([^,]*)$/, ' or $1');
    this.locations = locationString;
  }
  doSubmitOrder() {
      // Make an entry into the Booking Docket that Bail is Granted
      console.log('Creating Entry');
      const currentTimeDate = moment().unix().toString();
      const bookingEvent: BookingEvents = {
        description: 'Bail has been granted by ' + this.hearing.judgeName + ' on ' + moment().format('MMMM Do, YYYY') + ' at ' + moment().format('h:mm A') + '.',
        bookingID: this.hearing.bookingID,
        judge: this.hearing.judgeName,
        judgeID: this.hearing.judgeID,
        offenderID: this.hearing.offenderID,
        title: 'BAIL GRANTED',
        type: 'granted',
        unixDate: currentTimeDate
      };
      this.bs.saveNewEvent(bookingEvent);

      // Update the disposition for the Application Status in the Docket
      const newBookingEvent: BookingEvents = {
        status: 'inactive',
        disposition: 'granted',
      }
      this.bs.updateEvent(this.hearing.eventID, newBookingEvent);


      // Update the Booking to show that Bail has been granted
      const newBooking: Booking = {
        hearingSet: 'No',
        hearingAssignDate: '',
        bailStatus: 'granted',
        bondSignaturePin: '',
        pinEntered: '',
        judgeSignature: '',
      };
      this.bs.updateBooking(this.hearing.bookingID, newBooking);
      // // Get all of the locations that are checked in the document between the div tag with the id of 'locationChecks' and if the checkbox is checked, add it to an array
      // const locationChecks = document.getElementById('locationChecks') as HTMLDivElement;
      // const locationCheckboxes = locationChecks.getElementsByTagName('input');
      // const locationArray = [];
      // for (let i = 0; i < locationCheckboxes.length; i++) {
      //   if (locationCheckboxes[i].checked) {
      //     locationArray.push(locationCheckboxes[i].value);
      //   }
      //   // Using the getPoliceStation function, convert each location in the locationArray to the actual name of the police station
      //   for (let i = 0; i < locationArray.length; i++) {
      //     locationArray[i] = this.getPoliceStation(locationArray[i]);
      //   }
      //   // Take the locationArray and convert it to a string separated by commas and put the work 'and' before the last item in the array
      //   const locationString = locationArray.join(', ').replace(/, ([^,]*)$/, ' or $1');
      //   this.hearing.bailReportLocation = locationString;
      // }
      this.hearing.bailReportLocation = this.locations;
      const hearingTimeStamp = moment().unix();
      this.hearing.hearingDateUnix = '';
      this.hearing.hearingDateUnix = hearingTimeStamp.toString();
      this.hearing.grantBailChecked = true;
      this.hearing.registrarAck = false;
      this.hearing.active = true;
      this.hs.updateHearing(this.hearing);
    // Create a timed swal modal to let the user know the Order has been submitted
    Swal.fire({
      title: 'Order Submitted',
      text: 'The Order has been submitted to the Registrar for processing.',
      icon: 'success',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    }).then((result) => {
      this.onExit.emit(true);
    });
  }


}
