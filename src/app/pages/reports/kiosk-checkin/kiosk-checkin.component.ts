import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'; // Added OnDestroy
import { AngularFirestore, DocumentChangeAction } from '@angular/fire/compat/firestore'; // Added DocumentChangeAction
import { Router } from '@angular/router';
import { Table } from 'primeng/table';
import Swal from 'sweetalert2';
import firebase from 'firebase/compat/app'; // Import firebase for Timestamp if needed, or for type checking
import { Subscription, Observable } from 'rxjs'; // Import Subscription and Observable
import { map } from 'rxjs/operators'; // Import map operator

// Define the KioskCheckin interface as provided by you
export interface KioskCheckin {
  afisID: string;
  datetime: string;
  location: string;
  name: string; // This is the defendant's name
  photoURL?: string;
  unix: string; // Unix timestamp as a string (milliseconds)
}

// Define an extended interface for the data displayed in the table
// This includes the original KioskCheckin properties plus derived/mapped properties
interface DisplayKioskCheckin extends KioskCheckin {
  checkinDate: Date;
  dayOfWeek: string;
  defendantName: string; // Explicitly add defendantName to map from 'name'
}

// Define a type alias for the allowed range values, now including 'all'
type DateRange = 'week' | 'month' | '3months' | '6months' | 'all';

@Component({
  selector: 'app-kiosk-checkin',
  templateUrl: './kiosk-checkin.component.html',
  styleUrls: ['./kiosk-checkin.component.scss']
})
export class KioskCheckinComponent implements OnInit, OnDestroy { // Implement OnDestroy
  @ViewChild('dt') dt: Table | undefined;

  kioskCheckins: DisplayKioskCheckin[] = []; // Use the extended interface
  filteredKioskCheckins: DisplayKioskCheckin[] = []; // Use the extended interface
  isLoading: boolean = true;
  globalFilter: string = '';

  selectedRange: DateRange = 'week'; // Default to 'Past Week'
  displayedCount: number = 0;
  currentDateRange: string = '';

  private checkinSubscription: Subscription | undefined; // To hold the Firestore subscription

  // Inject AngularFirestore (compat) and Router
  constructor(private afs: AngularFirestore, private router: Router) { }

  ngOnInit(): void {
    // Load check-ins for the default 'Past Week' range on component initialization
    this.loadCheckins(this.selectedRange);
  }

  ngOnDestroy(): void {
    // Unsubscribe from the Firestore listener to prevent memory leaks
    if (this.checkinSubscription) {
      this.checkinSubscription.unsubscribe();
    }
  }

  /**
   * Calculates the start date based on the selected range.
   * @param range The selected time range ('week', 'month', '3months', '6months').
   * @returns A Date object representing the start of the filter period.
   */
  private getStartDate(range: Exclude<DateRange, 'all'>): Date { // Exclude 'all' as it doesn't have a start date
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7); // 7 days ago
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1); // 1 month ago
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3); // 3 months ago
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6); // 6 months ago
        break;
      default:
        startDate.setDate(now.getDate() - 7); // Fallback, though type-safe
    }
    // Set hours, minutes, seconds, milliseconds to 0 to ensure filtering from the beginning of the start day
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * Generates a user-friendly string for the date range.
   * @param startDate The start date of the range.
   * @param endDate The end date of the range.
   * @returns A formatted string representing the date range.
   */
  private getDateRangeString(startDate: Date | null, endDate: Date | null): string {
    if (startDate === null || endDate === null) {
      return 'All Records'; // For the 'all' range
    }
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const start = startDate.toLocaleDateString('en-US', options);
    const end = endDate.toLocaleDateString('en-US', options);
    return `${start} - ${end}`;
  }

  /**
   * Loads check-in data from Firestore based on the specified date range.
   * This method now uses Firestore's real-time `snapshotChanges()` to keep the table updated.
   * @param range The time range to filter check-ins by.
   */
  async loadCheckins(range: DateRange): Promise<void> {
    this.isLoading = true;
    this.selectedRange = range;

    // Unsubscribe from any previous subscription to avoid multiple listeners
    if (this.checkinSubscription) {
      this.checkinSubscription.unsubscribe();
    }

    // Explicitly type collectionObservable as Observable<DocumentChangeAction[]>
    let collectionObservable: Observable<DocumentChangeAction<KioskCheckin>[]>;

    if (range === 'all') {
      // Fetch all documents if 'all' is selected
      collectionObservable = this.afs.collection<KioskCheckin>('kioskCheckin').snapshotChanges();
    } else {
      const startDate = this.getStartDate(range);
      const startDateUnixTimestampMilliseconds = startDate.getTime();
      const paddedStartDateUnixTimestamp = startDateUnixTimestampMilliseconds.toString().padStart(13, '0');

      // Use AngularFirestore's collection method with a query
      collectionObservable = this.afs.collection<KioskCheckin>('kioskCheckin', ref =>
        ref.where('unix', '>=', paddedStartDateUnixTimestamp)
      ).snapshotChanges();
    }

    // Subscribe to the observable to get real-time updates
    this.checkinSubscription = collectionObservable.pipe(
      map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as KioskCheckin;
          const id = a.payload.doc.id;
          // Convert the 'unix' string timestamp (milliseconds) to a JavaScript Date object
          const checkinDate = new Date(parseInt(data.unix, 10)); // Parse directly as milliseconds
          const dayOfWeek = checkinDate.toLocaleDateString('en-US', { weekday: 'long' });

          return {
            id, // Include the document ID
            ...data,
            defendantName: data.name, // Map the 'name' field to 'defendantName'
            checkinDate: checkinDate,
            dayOfWeek: dayOfWeek
          } as DisplayKioskCheckin; // Cast to the extended interface
        });
      })
    ).subscribe(checkins => {
      // Sort the check-ins by checkinDate in descending order (most recent first) client-side.
      this.kioskCheckins = checkins.sort((a, b) => b.checkinDate.getTime() - a.checkinDate.getTime());
      this.filteredKioskCheckins = [...this.kioskCheckins]; // Initialize filtered list with all loaded data

      // Update summary information based on the selected range
      this.displayedCount = this.filteredKioskCheckins.length;
      if (range === 'all') {
        this.currentDateRange = this.getDateRangeString(null, null); // Indicate 'All Records'
      } else {
        this.currentDateRange = this.getDateRangeString(this.getStartDate(range), new Date());
      }

      // If a global filter is active, re-apply it to the newly loaded data
      if (this.globalFilter && this.dt) {
        this.dt.filterGlobal(this.globalFilter, 'contains');
        this.displayedCount = this.dt.filteredValue ? this.dt.filteredValue.length : this.filteredKioskCheckins.length;
      }

      this.isLoading = false; // Set loading to false once data is received
    }, error => {
      console.error('Error fetching kiosk check-ins:', error);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to load check-ins. Please try again later.',
      });
      this.isLoading = false;
    });
  }

  /**
   * Handles the click event for the "Show All" button.
   * Displays a warning dialog before proceeding to load all records.
   */
  async loadAllCheckins(): Promise<void> {
    const result = await Swal.fire({
      title: 'Load All Records?',
      text: 'Loading all records is a server-intensive operation and may cause your browser to run slowly due to the large dataset (approx. 30,000 records). Do you wish to proceed?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, load all!',
      cancelButtonText: 'No, cancel',
      customClass: {
        confirmButton: 'btn btn-primary', // Apply Bootstrap button class
        cancelButton: 'btn btn-danger'    // Apply Bootstrap button class
      },
      buttonsStyling: false // Disable default SweetAlert styling to use Bootstrap classes
    });

    if (result.isConfirmed) {
      this.loadCheckins('all');
    }
  }

  /**
   * Applies a global filter to the PrimeNG table based on user input.
   * @param $event The input event from the search box.
   * @param stringVal The string value to filter by (e.g., 'contains').
   */
  applyFilterGlobal($event: any, stringVal: string) {
    if (this.dt) {
      const value = ($event.target as HTMLInputElement).value;
      this.globalFilter = value;
      this.dt.filterGlobal(value, stringVal);
      // Update displayed count based on the filtered value from PrimeNG table
      this.displayedCount = this.dt.filteredValue ? this.dt.filteredValue.length : this.kioskCheckins.length;
    }
  }

  /**
   * Displays the check-in photo in a SweetAlert2 modal.
   * @param photoUrl The URL of the photo to display.
   */
  viewPhoto(photoUrl: string): void {
    Swal.fire({
      imageUrl: photoUrl,
      imageAlt: 'Check-in Photo',
      showCloseButton: true,
      showConfirmButton: false,
      width: 'auto',
      customClass: {
        image: 'img-fluid rounded shadow',
      }
    });
  }

  /**
   * Navigates the user back to the criminal registry route.
   */
  exitKiosk(): void {
    this.router.navigate(['/criminalregistry']);
  }
}
