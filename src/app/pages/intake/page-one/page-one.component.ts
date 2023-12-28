import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {Defendants} from "../../../models/defendants";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {take} from "rxjs";
import swal from "sweetalert2";
import {Afis} from "../../../models/afis";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";

@Component({
  selector: 'app-page-one',
  templateUrl: './page-one.component.html',
  styleUrls: ['./page-one.component.scss']
})
export class PageOneComponent implements OnInit {
  @Output() newDefendant: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() selectDef: EventEmitter<Defendants> = new EventEmitter<Defendants>();
  lastName = '';
  firstName = '';
  dob = '';
  defendants: Defendants[] = [];
  defendantUpdateForm: Defendants = {} as Defendants;
  showDefendantUpdateForm = false;
  allAfisResults: Afis[] = [];
  selectedAfis: Afis = {} as Afis;
  showMainScreen = true;

  constructor(private http: HttpClient, private firestore: AngularFirestore, private router: Router) {
  }

  ngOnInit(): void {
    const inputFields1: HTMLCollectionOf<HTMLInputElement> = document.getElementsByTagName('input') as HTMLCollectionOf<HTMLInputElement>;
    inputFields1[0].focus();
    // Put a yellow background on all input and date fields
    const inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].style.backgroundColor = 'yellow';
    }
    // When an input field has been changed, turn the background green
    const inputFields: HTMLCollectionOf<HTMLInputElement> = document.getElementsByTagName('input') as HTMLCollectionOf<HTMLInputElement>;
    for (let i = 0; i < inputFields.length; i++) {
      inputFields[i].addEventListener('change', () => {
        inputFields[i].style.backgroundColor = 'greenyellow';
        inputFields[i].style.color = 'black';
      });
    }
  }

  doAFISSearch() {
    // Take the lastname and uppercase the first letter and lowercase all other letters
    const formatedLastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
    // Take the dob and format it to MM/DD/YYYYT00:00:00
    const date = new Date(this.dob + 'T00:00:00');
    const formatedDOB = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    // Encode the date of birth for the url
    const encodedDOB = encodeURIComponent(formatedDOB);
    console.log('Last Name, DOB, Encoded DOB', formatedLastName, formatedDOB, encodedDOB)
    // Search for a profile
    this.http.get(`https://us-central1-bbms-1283c.cloudfunctions.net/afis/getOffenderByName/${formatedLastName}/${encodedDOB}`).pipe(take(1)).subscribe((profile: Afis[]) => {
      // Sort the results by the datetime field
      profile.sort((a, b) => {
        return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
      });
      // In the results, only keep the newest record
      profile = profile.slice(0, 1);
      // Set the results to the allAfisResults array
      this.allAfisResults = profile;
      // Check each result to see if there is a BBMS record
      this.allAfisResults.forEach((afis: Afis) => {
        this.firestore.collection('users', ref => ref
          .where('spn', '==', afis.id))
          .valueChanges().pipe(take(1)).subscribe((defendants: Defendants[]) => {
          if (defendants.length > 0) {
            afis.bbms = 'YES';
          } else {
            afis.bbms = 'NO';
          }
        });
      } );
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

  checkBBMSRecord(afis: string): string {
    let found = 'NO';
    console.log('AFIS', afis);
    this.firestore.collection('users', ref => ref
      .where('spn', '==', afis))
      .valueChanges().pipe(take(1)).subscribe((defendants: Defendants[]) => {
      if (defendants.length > 0) {
        found = 'YES';
      }
    });
    return found;
  }

  doUpdate(afis: Afis) {


  }

  doHelp() {
    swal.fire({
      title: 'Help',
      text: 'Enter the Last Name of the Defendant and the Date of Birth. Click the Search button to search for the Defendant in the AFIS system. If the Defendant is found, click the Import button to import the Defendant\'s information into the BBMS system. If the Defendant is found in the BBMS as well, click the Update Button to update the BBMS Record with the latest AFIS Record.',
      icon: 'info',
      showConfirmButton: true,
      confirmButtonText: 'Got It!'
    });
  }

  doImport(afis: Afis) {
    this.selectedAfis = afis;
    this.showDefendantUpdateForm = true;
    this.showMainScreen = false;
  }
  doCloseUpdate($event) {
    this.showDefendantUpdateForm = false;
    this.showMainScreen = true;
    this.selectedAfis = {} as Afis;
    this.lastName = '';
    this.dob = '';
    this.allAfisResults = [];
    // Set focus on the first form field on the page
    const inputFields: HTMLCollectionOf<HTMLInputElement> = document.getElementsByTagName('input') as HTMLCollectionOf<HTMLInputElement>;
    inputFields[0].focus();

  }

  doExit() {
    // Use the router to navigate back to the dashboard page
    this.router.navigate(['/']);
  }
}
