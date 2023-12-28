import { Injectable } from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/compat/firestore";
import {Hearings} from '../models/hearings';
import {Observable} from 'rxjs';
import { map } from 'rxjs/operators';
import {Booking} from '../models/booking';
import {Members} from "../models/members";

@Injectable({
  providedIn: 'root'
})
export class HearingServiceService {

  hearingCollection: AngularFirestoreCollection<Hearings>;
  hearing: Observable<Hearings[]>;
  orders: Observable<Hearings[]>;

  constructor(private afs: AngularFirestore) {
    this.hearingCollection = afs.collection('hearings', ref => ref.orderBy('hearingDateUnix', 'asc'));
  }

  getHearings() {
    this.hearing = this.afs.collection('hearings', ref => ref.orderBy('hearingDateUnix', 'asc').where('active', '==', true)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  // return all members from the collection called 'members'
  getJudges() {
    return this.afs.collection('members', res => res.where('authJudge','==', true)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Members;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
  }

  getAllHearings() {
    this.hearing = this.afs.collection('hearings').snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  getHearingOrders() {
    this.orders = this.afs.collection('hearings', ref =>
      ref.orderBy('hearingDateUnix', 'asc')
        .where('grantBailChecked', '==', true)
        .where('registrarAck', '==', false)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.orders;
  }

  getAllActiveBookings() {
return this.afs.collection('hearings', ref => ref.where('active', '==', true)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
  }

  getSingleHearing(id: string) {
    this.hearing = this.afs.collection('hearings', ref => ref.where('id', '==', id).orderBy('hearingDateUnix', 'asc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  getHearingbyOffenderId(id: string) {
    this.hearing = this.afs.collection('hearings', ref => ref.where('offenderID', '==', id)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  getHearingbyBookingId(id: string) {
    console.log('BookingID: ', id);
    this.hearing = this.afs.collection('hearings', ref => ref.where('bookingID', '==', id)).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  getHearingByEventId(id: string) {
    this.hearing = this.afs.collection('hearings', ref => ref.where('eventID', '==', id).orderBy('hearingDateUnix', 'asc')).snapshotChanges().pipe(
      map(changes => {
        return changes.map(action => {
          const data = action.payload.doc.data() as Hearings;
          data.id = action.payload.doc.id;
          return data;
        });
      }));
    return this.hearing;
  }

  createNewHearing(hearing: Hearings) {
    const id = this.afs.createId();
    hearing.id = id;
    this.hearingCollection.doc(id).set(hearing);
  }

  updateHearing(hearingData) {
    this.afs.collection(`hearings`).doc(hearingData.id).update(hearingData).then(d => {
      // Success
    }).catch(e => {
      console.log('Error: ' + e);
    });
  }
}
