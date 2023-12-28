import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Hearings} from "../../../models/hearings";
import {KioskCheckin} from "../../../models/kiosk-checkin";
import {take} from "rxjs/operators";

@Component({
  selector: 'app-kiosk-checkin',
  templateUrl: './kiosk-checkin.component.html',
  styleUrls: ['./kiosk-checkin.component.scss']
})
export class KioskCheckinComponent implements OnInit {
  checkins: KioskCheckin[] = [];
  reportDate = new Date().toLocaleDateString();

  constructor(private router: Router, private af: AngularFirestore) { }

  ngOnInit() {
    // Get all the active hearings
    this.af.collection<KioskCheckin>('kioskCheckin').valueChanges().pipe(take(1)).subscribe(checks => {
      this.checkins = checks.sort((a, b) => (a.unix > b.unix) ? 1 : -1);
      // Go through each checkin and get the Day of the week the checkin was made using the unix timestamp and store it in the checkin object under dayOfWeek
      this.checkins.forEach(checkin => {
        const date = new Date(parseInt(checkin.unix));
        checkin.dayOfWeek = date.toLocaleDateString('en-US', {weekday: 'long'});
      });
    });
  }

  doNameSort() {
    this.checkins.sort(this.compareCheckins);
  }

  doDateSort() {
    // Sort checkins by unix timestamp
    this.checkins = this.checkins.sort((a, b) => (a.unix > b.unix) ? 1 : -1);
  }

  compareCheckins(a, b) {
    // First, compare by 'name'
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;

    // If 'name' is the same, compare by timestamp
    if (a.unix < b.unix) return -1;
    if (a.unix > b.unix) return 1;

    return 0; // Elements are equal
  }

  doExit() {
    this.router.navigate(['/criminalregistry']);
  }
}
