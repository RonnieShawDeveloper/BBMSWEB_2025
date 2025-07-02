import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-system-report',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './system-report.component.html',
  styleUrls: ['./system-report.component.scss']
})
export class SystemReportComponent implements OnInit {
  usersCount: number = 0;
  magistrateCount: number = 0;
  genderCount: { male: number, female: number } = { male: 0, female: 0 };
  userLocalityData: { [key: string]: number } = {};
  magistrateLocalityData: { [key: string]: number } = {};

  constructor(private firestore: AngularFirestore) { }

  ngOnInit(): void {
    this.getUsersData();
    this.getMagistrateData();
  }

  getUsersData(): void {
    this.firestore.collection('users').valueChanges().subscribe((users: any[]) => {
      this.usersCount = users.length;
      this.genderCount = { male: 0, female: 0 };
      this.userLocalityData = {};

      users.forEach(user => {
        // Gender Count
        if (user.gender) {
          if (user.gender.toLowerCase() === 'male') {
            this.genderCount.male++;
          } else if (user.gender.toLowerCase() === 'female') {
            this.genderCount.female++;
          }
        }

        // Locality Count (City & State)
        const localityKey = `${user.city}, ${user.state}`;
        if (localityKey in this.userLocalityData) {
          this.userLocalityData[localityKey]++;
        } else {
          this.userLocalityData[localityKey] = 1;
        }
      });
    });
  }

  getMagistrateData(): void {
    this.firestore.collection('magistrateBookings').valueChanges().subscribe((bookings: any[]) => {
      this.magistrateCount = bookings.length;
      this.magistrateLocalityData = {};

      bookings.forEach(booking => {
        // Locality Count (Locality & Island)
        const localityKey = `${booking.locality}, ${booking.island}`;
        if (localityKey in this.magistrateLocalityData) {
          this.magistrateLocalityData[localityKey]++;
        } else {
          this.magistrateLocalityData[localityKey] = 1;
        }
      });
    });
  }

  printReport(): void {
    window.print();
  }
}
