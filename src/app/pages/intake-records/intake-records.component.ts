import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';
import { Offender } from '../../models/offender';
import { Booking } from '../../models/booking';
import { Afis } from '../../models/afis';

@Component({
  selector: 'app-intake-records',
  templateUrl: './intake-records.component.html',
  styleUrls: ['./intake-records.component.scss']
})
export class IntakeRecordsComponent implements OnInit, OnDestroy {
  // View state management
  showSearch = true;
  showCreate = false;
  showDetails = false;
  showBooking = false;

  // Data objects
  selectedOffender: Offender = {};
  selectedBooking: Booking = {};
  selectedAfis: Afis = {};
  tempAfisId: string = '';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(private firestore: AngularFirestore) { }

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Handler for when an offender is selected from search
  onOffenderSelected(offender: Offender): void {
    this.selectedOffender = offender;
    this.showSearch = false;
    this.showDetails = true;
  }

  // Handler for when a new offender needs to be created
  onCreateOffender(afis: Afis): void {
    this.selectedAfis = afis;
    this.showSearch = false;
    this.showCreate = true;
  }

  // Handler for when a temporary AFIS ID needs to be created
  onCreateTempAfis(): void {
    // Generate a temporary AFIS ID using timestamp
    this.tempAfisId = 'TEMP-' + Date.now().toString();
    this.selectedAfis = { id: this.tempAfisId } as Afis;
    this.showSearch = false;
    this.showCreate = true;
  }

  // Handler for when an offender is created
  onOffenderCreated(offender: Offender): void {
    this.selectedOffender = offender;
    this.showCreate = false;
    this.showDetails = true;
  }

  // Handler for when a booking is selected
  onBookingSelected(booking: Booking): void {
    this.selectedBooking = booking;
    this.showDetails = false;
    this.showBooking = true;
  }

  // Handler for when a new booking is to be created
  onCreateBooking(): void {
    this.selectedBooking = { linkedOffenderID: this.selectedOffender.id } as Booking;
    this.showDetails = false;
    this.showBooking = true;
  }

  // Handler for when booking view is closed
  onBookingClosed(): void {
    this.showBooking = false;
    this.showDetails = true;
  }

  // Handler for when details view is closed
  onDetailsClosed(): void {
    this.showDetails = false;
    this.showSearch = true;
    this.selectedOffender = {};
  }

  // Handler for when create view is closed
  onCreateClosed(): void {
    this.showCreate = false;
    this.showSearch = true;
    this.selectedAfis = {};
    this.tempAfisId = '';
  }
}
