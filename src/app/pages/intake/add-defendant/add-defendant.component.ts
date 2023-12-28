import {Component, EventEmitter, Output} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {take} from "rxjs";
import {Afis} from "../../../models/afis";
import swal from "sweetalert2";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Defendants} from "../../../models/defendants";

@Component({
  selector: 'app-add-defendant',
  templateUrl: './add-defendant.component.html',
  styleUrls: ['./add-defendant.component.scss']
})
export class AddDefendantComponent {

  lastName: string;
  dob: string;
  selectedAfis: Afis = {} as Afis;
  allAfisResults: Afis[] = [];
  showUpdateScreen = false;
  existInBBMS = false;
  openBookings = false;

  @Output() complete:EventEmitter<boolean> = new EventEmitter<boolean>();


  constructor(private http: HttpClient, private fs: AngularFirestore) { }


  doSearch() {
    // Take the lastname and uppercase the first letter and lowercase all other letters
    const formatedLastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
    // Take the dob and format it to MM/DD/YYYYT00:00:00
    const date = new Date(this.dob+'T00:00:00');
    const formatedDOB = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    // Encode the date of birth for the url
    const encodedDOB = encodeURIComponent(formatedDOB);
    console.log('Last Name, DOB, Encoded DOB',formatedLastName, formatedDOB, encodedDOB)
    // Search for a profile
    this.http.get(`https://us-central1-bbms-1283c.cloudfunctions.net/afis/getOffenderByName/${formatedLastName}/${encodedDOB}`).pipe(take(1)).subscribe((profile:Afis[]) => {
      // Sort the results by the datetime field
      profile.sort((a, b) => {
        return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
      });
      // Set the results to the allAfisResults array
      this.allAfisResults = profile;
      // If the results are greater than 0, provide a sweetalert message
      if (this.allAfisResults.length > 0) {
        swal.fire({
          title: 'Results Found',
          text: 'The Defendant was found in the AFIS database. They have been fingerprinted ' + this.allAfisResults.length + ' times. The newest profile is shown first.',
          icon: 'success',
          timer: 9000,
          timerProgressBar: true,
          showConfirmButton: true
        });
      }
      // If there are no results, provide a sweetalert message
      if (this.allAfisResults.length === 0) {
        swal.fire({
          title: 'No Results',
          text: 'No results found for this search. Please verify that the Defendant has been fingerprinted and that the information is correct.',
          icon: 'warning',
          timer: 9000,
          timerProgressBar: true,
          showConfirmButton: true
        });
        // Clear all input fields on the page
        this.lastName = '';
        this.dob = '';
        this.selectedAfis = {} as Afis;
        this.allAfisResults = [];
      }

    });
  }

  doImport(record) {
    this.selectedAfis = record;
    this.showUpdateScreen = true;
    this.checkBBMSforRecord();
  }

  checkBBMSforRecord() {
    this.fs.collection('users', ref => ref.where('spn', '==', this.selectedAfis.id)).get().pipe(take(1)).subscribe((snapshot) => {
      if (snapshot.docs.length > 0) {
        this.existInBBMS = true;
        this.checkForOpenBookings(snapshot.docs[0].data() as Defendants);
      }
    });
  }

  checkForOpenBookings(defendant: Defendants) {
    console.log('Defendant', defendant);
    this.fs.collection('bookings', ref => ref.where('id', '==', defendant.id)).get().pipe(take(1)).subscribe((snapshot) => {
      if (snapshot.docs.length > 0) {
        this.openBookings = true;
      }
    });
  }

  doCancel() {
    this.showUpdateScreen = false;
    this.complete.emit(true);
  }

}
