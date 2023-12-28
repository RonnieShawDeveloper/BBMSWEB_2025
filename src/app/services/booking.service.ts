import { Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument} from '@angular/fire/compat/firestore';
import { Booking } from '../models/booking';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {Count} from '../models/count';
import {ChargeDoc} from '../models/charge-doc';
import { BookingEvents } from '../models/events';
import {Hearings} from '../models/hearings';
import Swal from 'sweetalert2';


@Injectable({
  providedIn: 'root'
})
export class BookingService {

  // Firebase Collection
  bookingCollection: AngularFirestoreCollection<Booking>;
  chargesCollection: AngularFirestoreCollection<ChargeDoc>;
  countsCollection: AngularFirestoreCollection<Count>;
  eventsCollection: AngularFirestoreCollection<BookingEvents>

  // Firebase Single Document
  bookingDoc: AngularFirestoreDocument<Booking>;

  // Current list of All Offenders in an array
  bookings: Observable<Booking[]>;
  chargeDocs: Observable<ChargeDoc[]>;
  allCharges: Observable<ChargeDoc[]>;
  counts: Observable<Count[]>;
  allCounts: Observable<Count[]>;
  allBookingEvents: Observable<BookingEvents[]>;

  allPendingBailApps: Observable<BookingEvents[]>;

  singleEvent: Observable<BookingEvents>;

  // Single Offender
  booking: Observable<Booking>;

  book: any;

  constructor(private afs: AngularFirestore) {
    this.bookingCollection = afs.collection('bookings',
      ref => ref.orderBy('bookDate', 'desc'));

    this.chargesCollection = afs.collection('chargeDocs',
      ref => ref.orderBy('chargeNumber', 'desc'));

    this.countsCollection = afs.collection('counts',
      ref => ref.orderBy('countDate', 'desc'));

    this.eventsCollection = afs.collection('BookingEvents',
      ref => ref.orderBy('unixDate', 'asc'));
  }

  getBookings(offId: string) {
    this.bookings = this.afs.collection('bookings', ref => ref.where('offender', '==', offId).orderBy('bookDate', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Booking;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.bookings;
  }

  getBookingsByAttorney(attId: string) {
    this.bookings = this.afs.collection('bookings', ref => ref.where('attorneyID', '==', attId).orderBy('bookDate', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Booking;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.bookings;
  }


  getAllBookings() {
    this.bookings = this.afs.collection('bookings').snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Booking;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.bookings;
  }

  getCharges(bookId: string) {
    this.chargeDocs = this.afs.collection('chargeDocs', ref => ref.where('bookingID', '==', bookId).orderBy('chargeNumber', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as ChargeDoc;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.chargeDocs;
  }

  getAllCharges(offID: string) {
    this.allCharges = this.afs.collection('chargeDocs', ref => ref.where('offenderID', '==', offID)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as ChargeDoc;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allCharges;
  }

  getAllCounts(offID: string) {
    this.allCounts = this.afs.collection('counts', ref => ref.where('offenderID', '==', offID)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Count;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allCounts;
  }

  getAllCountsJet() {
    this.allCounts = this.afs.collection('counts').snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Count;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allCounts;
  }

  getCounts(bookId: string) {
    this.counts = this.afs.collection('counts', ref =>
      ref.where('bookingID', '==', bookId)
        .orderBy('countNo', 'desc'))
      .snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Count;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.counts;
  }

  getSingleBooking(id: string) {
    this.booking = this.afs.doc('bookings/' + id).valueChanges();
    return this.booking;
  }

  getSingleEvent(id: string) {
    this.singleEvent = this.afs.doc('BookingEvents/' + id).valueChanges();
    return this.singleEvent;
  }

  saveNewBooking(book: Booking) {
    console.log("Booking: ",book);
    // Check to see if the booking has an id
    if (book.id === null || book.id === undefined || book.id === '') {
      // Get a unique ID for the new booking
      const id = this.afs.createId();
      // Set the ID for the booking
      book.id = id;
    }
    this.afs.collection('bookings').doc(book.id).set(book).then(function (docRef) {
      // Create a Swal messsage to confirm the booking was saved
      Swal.fire({
        title: 'Booking Saved',
        text: 'Booking was saved successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    }).catch(function (error) {
      // Create a Swal message to alert the user of an error
      Swal.fire({
        title: 'Error',
        text: 'Booking was not saved successfully',
        icon: 'error',
        confirmButtonText: 'OK'
      })
    }
    );
  }

  saveNewChargeDoc(cd: ChargeDoc) {
    this.chargesCollection.add(cd);
  }
  saveNewCount(ct: Count) {
    this.countsCollection.add(ct);
  }

  updateBooking(bookID: string, bookData: Booking) {
    this.bookingCollection.doc(bookID).update(bookData);
  }

  updateCount(count) {
    this.countsCollection.doc(count.id).update(count);
  }

  updateEvent(eventID: string, eventData: BookingEvents) {
    this.eventsCollection.doc(eventID).update(eventData);
  }


  getAllEvents(offID: string) {
    this.allBookingEvents = this.afs.collection('BookingEvents', ref => ref.where('offenderID', '==', offID).orderBy('unixDate', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as  BookingEvents;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allBookingEvents;
  }

  getBookingEvents(bookID: string) {
    this.allBookingEvents = this.afs.collection('BookingEvents', ref => ref.where('bookingID', '==', bookID).orderBy('unixDate', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as  BookingEvents;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allBookingEvents;
  }

  deleteEvent(id) {
    this.afs.collection('BookingEvents').doc(id).delete();
  }



  getAllPendingBailApps() {
    this.allPendingBailApps = this.afs.collection( 'BookingEvents', ref => ref.where( 'type', '==', 'bailApp')
      .where('status', '==', 'active')
      .orderBy('unixDate', 'desc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as  BookingEvents;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.allPendingBailApps;
  }

  saveNewEvent(nb: BookingEvents) {
    this.eventsCollection.add(nb);
  }
}
