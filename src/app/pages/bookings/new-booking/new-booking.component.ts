import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import {myTrades} from '../../../models/occupations';
import {BookingService} from '../../../services/booking.service';
import {Count} from '../../../models/count';
import {unix} from 'moment';
import {Booking} from '../../../models/booking';
import {take} from 'rxjs/operators';
import Swal from "sweetalert2";

@Component({
  selector: 'app-new-booking',
  templateUrl: './new-booking.component.html',
  styleUrls: ['./new-booking.component.css']
})
export class NewBookingComponent implements OnInit, OnDestroy {

  page1 = true;
  page2 = false;
  page3 = false;

  newBooking: Booking = {};

  openBooking = false;

  @Input() offenderID;
  @Output() cancelMe = new EventEmitter<boolean>();
  @Output() showBookings = new EventEmitter<boolean>();

  bookDate = moment().format('YYYY-MM-DD');
  bookTime = moment().format('HH:mm');

  trades = myTrades;

  counts: Count[] = [];
  subscribed = [];

  constructor(private bs: BookingService) {
  }

  ngOnInit() {
    // to every field in the newbooking object, add a new property called 'value' and set it to an empty string
    Object.keys(this.newBooking).map(key => {
      this.newBooking[key] = '';
    });
    this.newBooking.bookDate = this.bookDate;
    this.newBooking.bookTime = this.bookTime;
    this.newBooking.offender = this.offenderID;
    console.log("new booking: ", this.newBooking);

    this.subscribed.push(this.bs.getAllCounts(this.offenderID).subscribe(res => {
      res.sort(this.compareTime);
      this.counts = res;
      this.bs.getBookings(this.offenderID).pipe(take(1)).subscribe(books => {
        books.map(bk => {
          if (bk.bookingStatus === 'Open') { this.openBooking = true; }
        });
      });
    }));
  }

  cancel() {
    this.cancelMe.emit(true);
  }

  convertTime(value) {
    return moment(unix(value)).format('MM-DD-YYYY');
  }

  countAge(value) {
    return moment().diff(moment(unix(value)), 'days');
  }

  compareTime(a, b) {
    let comparison;
    if (a.countDate > b.countDate) {
      comparison = -1;
    } else if (a.countDate < b.countDate) {
      comparison = 1;
    }
    return comparison;
  }

  createBooking() {
    this.newBooking.bookDate = moment(this.newBooking.bookDate + ' ' + this.newBooking.bookTime, 'YYYY-MM-DD HH:mm').unix().toString(10);
    this.newBooking.bookingStatus = 'Open';
    this.newBooking.offender = this.offenderID;
    this.bs.saveNewBooking(this.newBooking)
    this.showBookings.emit(true);
  }

  ngOnDestroy(): void {
    this.subscribed.map(subs => {
      subs.unsubscribe();
    });
    this.subscribed = [];
  }
}
