import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { Subscription, take } from 'rxjs';
import { Offender } from '../../../models/offender';
import { Afis } from '../../../models/afis';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-intake-records-search',
  templateUrl: './intake-records-search.component.html',
  styleUrls: ['./intake-records-search.component.scss']
})
export class IntakeRecordsSearchComponent implements OnInit, OnDestroy {
  @Output() offenderSelected = new EventEmitter<Offender>();
  @Output() createOffender = new EventEmitter<Afis>();
  @Output() createTempAfis = new EventEmitter<void>();

  // Search parameters
  lastName: string = '';
  firstName: string = '';
  dob: string = '';

  // Search results
  offenderResults: Offender[] = [];
  afisResults: Afis[] = [];

  // Loading state
  isLoading: boolean = false;

  // Search state
  searchAttempted: boolean = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private firestore: AngularFirestore,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Focus on the first input field when component loads
    setTimeout(() => {
      const inputFields = document.getElementsByTagName('input');
      if (inputFields.length > 0) {
        inputFields[0].focus();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Search for offenders in the local database
  searchOffenders(): void {
    if (!this.lastName) {
      Swal.fire({
        title: 'Input Required',
        text: 'Please enter at least a last name to search',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.isLoading = true;
    this.searchAttempted = true;

    // Format the last name (capitalize first letter, lowercase rest)
    const formattedLastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();

    // Query Firestore for offenders with matching last name
    this.subscriptions.push(
      this.firestore.collection('users', ref =>
        ref.where('lName', '==', formattedLastName)
      ).valueChanges().pipe(take(1)).subscribe((results: any[]) => {
        this.offenderResults = results;
        this.isLoading = false;

        // If no results found, search AFIS
        if (this.offenderResults.length === 0) {
          this.searchAfis();
        }
      })
    );
  }

  // Search for offenders in AFIS
  searchAfis(): void {
    if (!this.lastName || !this.dob) {
      Swal.fire({
        title: 'Input Required',
        text: 'Please enter both last name and date of birth to search AFIS',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.isLoading = true;
    this.searchAttempted = true;

    // Format the last name and DOB for the AFIS API
    const formattedLastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
    const date = new Date(this.dob + 'T00:00:00');
    const formattedDOB = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const encodedDOB = encodeURIComponent(formattedDOB);

    // Call the AFIS API
    this.http.get<Afis[]>(`https://us-central1-bbms-1283c.cloudfunctions.net/afis/getOffenderByName/${formattedLastName}/${encodedDOB}`)
      .pipe(take(1))
      .subscribe({
        next: (results) => {
          // Sort results by datetime (newest first)
          const sortedResults = results.sort((a, b) => {
            return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
          });

          // Only display the newest record if records are found
          if (sortedResults.length > 0) {
            const newestRecord = sortedResults[0];

            // Check if an offender with the same AFIS ID already exists in the users collection
            if (newestRecord.id) {
              this.firestore.collection('users', ref =>
                ref.where('spn', '==', newestRecord.id)
              ).valueChanges().pipe(take(1)).subscribe((existingUsers: any[]) => {
                if (existingUsers.length > 0) {
                  // User already exists in BBMS
                  newestRecord['existsInBBMS'] = true;
                }

                // Set the afisResults to only contain the newest record
                this.afisResults = [newestRecord];
                this.isLoading = false;
              });
            } else {
              // No id field, just display the newest record
              this.afisResults = [newestRecord];
              this.isLoading = false;
            }
          } else {
            this.afisResults = [];
            this.isLoading = false;

            Swal.fire({
              title: 'No Records Found',
              text: 'No records found in AFIS. Would you like to create a new record?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Create New Record',
              cancelButtonText: 'Cancel'
            }).then((result) => {
              if (result.isConfirmed) {
                this.createTempAfis.emit();
              }
            });
          }
        },
        error: (error) => {
          console.error('Error searching AFIS:', error);
          this.isLoading = false;

          Swal.fire({
            title: 'Error',
            text: 'An error occurred while searching AFIS. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      });
  }

  // Select an offender from the search results
  selectOffender(offender: Offender): void {
    this.offenderSelected.emit(offender);
  }

  // Import an AFIS record to create a new offender
  importAfisRecord(afis: Afis): void {
    this.createOffender.emit(afis);
  }

  // Create a new offender with a temporary AFIS ID
  createNewOffender(): void {
    this.createTempAfis.emit();
  }

  // Clear search form
  clearSearch(): void {
    this.lastName = '';
    this.firstName = '';
    this.dob = '';
    this.offenderResults = [];
    this.afisResults = [];
    this.searchAttempted = false;

    // Focus on the first input field
    const inputFields = document.getElementsByTagName('input');
    if (inputFields.length > 0) {
      inputFields[0].focus();
    }
  }
}
