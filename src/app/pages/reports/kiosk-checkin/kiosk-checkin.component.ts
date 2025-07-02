import {Component, OnInit, ViewChild} from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { KioskCheckin } from '../../../models/kiosk-checkin';
import {Table} from "primeng/table";
import Swal from 'sweetalert2'; // Import SweetAlert2

@Component({
  selector: 'app-kiosk-checkin',
  templateUrl: './kiosk-checkin.component.html',
  styleUrls: ['./kiosk-checkin.component.scss']
})
export class KioskCheckinComponent implements OnInit {
  @ViewChild('dt') dt!: Table; // Reference the p-table instance using ViewChild

  checkins: {
    afisID: string;
    datetime: string;
    location: string;
    name: string;
    photoURL?: string;
    unix: number;
    checkinDate: Date;
    dayOfWeek: string;
  }[] = [];
  totalRecords: number = 0;
  reportDate = new Date().toLocaleDateString();
  loading: boolean = true;

  filterTable(value: string) {
    this.dt.filter(value, 'name', 'contains');
  }

  constructor(private router: Router, private af: AngularFirestore) { }

  ngOnInit() {
    const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);

    this.af.collection<KioskCheckin>('kioskCheckin').valueChanges().subscribe((checks: KioskCheckin[]) => {
      console.log("Counts: ", checks.length);

      this.checkins = checks
        .map(checkin => {
          const unixTimestamp = parseInt(checkin.unix);
          const checkinDate = new Date(unixTimestamp);
          return {
            ...checkin,
            unix: unixTimestamp,
            checkinDate: checkinDate,
            dayOfWeek: checkinDate.toLocaleDateString('en-US', { weekday: 'long' })
          };
        })
        .filter(checkin => checkin.unix >= sixMonthsAgo)
        .sort((a, b) => b.unix - a.unix);

      this.totalRecords = this.checkins.length;
      this.loading = false;
    });
  }

  showPhoto(photoURL: string) {
    Swal.fire({
      title: 'Check-in Photo',
      imageUrl: photoURL,
      imageWidth: 640, // Set the image width
      imageHeight: 480, // Set the image height
      imageAlt: 'Check-in Photo',
      showCloseButton: true,
      confirmButtonText: 'Close'
    });
  }

  doExit() {
    this.router.navigate(['/criminalregistry']);
  }
}
