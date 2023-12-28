import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {animate, keyframes, style, transition, trigger} from '@angular/animations';
import {Offender} from '../../../models/offender';
import {Members} from '../../../models/members';
import {Hearings} from '../../../models/hearings';
import {Booking} from '../../../models/booking';
import {take} from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-attorney-of-record',
  templateUrl: './attorney-of-record.component.html',
  styleUrls: ['./attorney-of-record.component.css'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({opacity: 0, height: 0, overflow: 'hidden'}),
        animate(500, keyframes([
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
export class AttorneyOfRecordComponent implements OnInit {


  @Input() attoney: Members = {};
  @Output() exit: EventEmitter<boolean> = new EventEmitter<boolean>();

  showMotion = false;
  selectedDefendant: Offender = {};

  allBooking: Booking[] = [];
  selectedBooking: Booking = {};

  lastName: string;
  dob: string;

  constructor() { }

  ngOnInit(): void {
  }

  doCancelMotion() {
    this.selectedDefendant = {};
    this.selectedBooking = {};
    this.allBooking = [];
    this.lastName = null;
    this.dob = null;
    this.exit.emit(true);
  }

   searchDefendants() {
  //   this.lastName = this.lastName.substr(0, 1).toUpperCase() + this.lastName.substr(1).toLowerCase();
  //   this.os.getOffendersByLast(this.lastName).pipe(take(1)).subscribe(def => {
  //     if (def.length === 0) {
  //       Swal.fire({
  //         title: 'NOT FOUND',
  //         text: 'No defendant was found with that Name and Date of Birth Combination',
  //         confirmButtonText: 'OK',
  //         allowOutsideClick: false,
  //         icon: 'error'
  //       }).then(() => {
  //         this.selectedDefendant = {};
  //         this.selectedBooking = {};
  //         this.allBooking = [];
  //         this.lastName = null;
  //         this.dob = null;
  //         this.exit.emit(true);
  //       });
  //     }
  //     console.log('Defendant Found', def);
  //     def.map(d => {
  //       if (d.dob === this.dob) {
  //         console.log('Correct Defendant Found', d);
  //        this.selectedDefendant = d;
  //        this.bs.getBookings(this.selectedDefendant.id).pipe(take(1)).subscribe(books => {
  //          console.log('Bookings: ', books);
  //          this.allBooking = books;
  //          this.allBooking.sort((a, b) => {
  //            return parseInt(b.bookDate, 10) - parseInt(a.bookDate, 10);
  //          });
  //          this.selectedBooking = this.allBooking[0];
  //
  //          if (this.allBooking[0].attorneyID !== undefined) {
  //            Swal.fire({
  //              title: 'ATTORNEY ASSIGNED',
  //              text: 'This case already has an Attorney of Record (' + this.allBooking[0].attorneyAssigned + '). Please contact the Criminal Court Registrar.',
  //              confirmButtonText: 'OK',
  //              allowOutsideClick: false,
  //              icon: 'error'
  //            }).then(() => {
  //              this.selectedDefendant = {};
  //              this.selectedBooking = {};
  //              this.allBooking = [];
  //              this.lastName = null;
  //              this.dob = null;
  //              this.exit.emit(true);
  //            });
  //          }
  //
  //          if (this.allBooking.length > 1) {
  //            Swal.fire({
  //              title: 'MULTIPLE OPEN BOOKINGS',
  //              text: 'There are Multiple Open Bookings for this Defendant. Your motion will be submitted for the newest open booking found.',
  //              confirmButtonText: 'OK',
  //              allowOutsideClick: false,
  //              icon: 'error'
  //            });
  //          }
  //        });
  //        return;
  //       }
  //     });
  //     if (this.selectedDefendant.id === undefined) {
  //       Swal.fire({
  //         title: 'NOT FOUND',
  //         text: 'No defendant was found with that Name and Date of Birth Combination',
  //         confirmButtonText: 'OK',
  //         allowOutsideClick: false,
  //         icon: 'error'
  //       }).then(() => {
  //         this.selectedDefendant = {};
  //         this.selectedBooking = {};
  //         this.allBooking = [];
  //         this.lastName = null;
  //         this.dob = null;
  //         this.exit.emit(true);
  //       });
  //     }
  //   });
   }


}
