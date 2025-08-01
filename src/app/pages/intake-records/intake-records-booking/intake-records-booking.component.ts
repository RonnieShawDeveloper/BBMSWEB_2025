import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Subscription, Observable, finalize } from 'rxjs';
import { Booking } from '../../../models/booking';
import { Offender } from '../../../models/offender';
import { Count } from '../../../models/count';
import { BookingEvents } from '../../../models/events';
import { HelperService } from '../../../services/helper.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-intake-records-booking',
  templateUrl: './intake-records-booking.component.html',
  styleUrls: ['./intake-records-booking.component.scss']
})
export class IntakeRecordsBookingComponent implements OnInit, OnDestroy {
  @Input() booking: Booking = {};
  @Input() offender: Offender = {};
  @Output() close = new EventEmitter<void>();

  // Booking state
  isNewBooking: boolean = false;
  isEditing: boolean = false;
  originalBooking: Booking = {};

  // Charges/Counts
  charges: Count[] = [];
  newCharge: Count = {};
  isAddingCharge: boolean = false;

  // Available crimes for autocomplete
  availableCrimes: {code: string, value: string}[] = [];
  filteredCrimes: {code: string, value: string}[] = [];
  selectedCrime: {code: string, value: string} | null = null;

  // Form state
  activeTab: string = 'details';
  isSubmitting: boolean = false;

  // Document handling
  bookingEvents: BookingEvents[] = [];
  downloadURL: Observable<string>;
  downloadURL2: Observable<string>;
  downloadURL3: Observable<string>;
  eventID: string;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private helperService: HelperService
  ) { }

  ngOnInit(): void {
    // Determine if this is a new booking
    this.isNewBooking = !this.booking.id;

    // Load available crimes for autocomplete
    this.availableCrimes = this.helperService.getCrimes();

    // If new booking, initialize with default values
    if (this.isNewBooking) {
      this.initializeNewBooking();
      this.isEditing = true;
    } else {
      // Make a copy of the original booking for potential cancellation
      this.originalBooking = { ...this.booking };

      // Load charges for existing booking
      this.loadCharges();

      // Load booking events
      this.loadBookingEvents();
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Initialize a new booking with default values
  initializeNewBooking(): void {
    const now = Date.now();

    this.booking = {
      id: this.firestore.createId(),
      linkedOffenderID: this.offender.id,
      afisID: this.offender.spn,
      offenderName: `${this.offender.lName}, ${this.offender.fName} ${this.offender.mName || ''}`.trim(),
      lastName: this.offender.lName,
      firstName: this.offender.fName,
      middleName: this.offender.mName,
      dob: this.offender.dob,
      address1: this.offender.addLine1,
      address2: this.offender.addLine2,
      locality: this.offender.city,
      island: this.offender.state,
      bookDate: now,
      bookTime: new Date().toLocaleTimeString(),
      bookingStatus: 'Open',
      bailAppPending: false,
      photoURL: this.offender.mainPhoto,
      unixDate: now.toString()
    };

    this.originalBooking = { ...this.booking };
  }

  // Load charges for the current booking
  loadCharges(): void {
    if (!this.booking.id) {
      return;
    }

    this.subscriptions.push(
      this.firestore.collection('counts', ref =>
        ref.where('bookingID', '==', this.booking.id)
      ).valueChanges().subscribe((charges: any[]) => {
        this.charges = charges;

        // Update the booking's charges array
        this.booking.charges = this.charges;
      })
    );
  }

  // Toggle edit mode
  toggleEditMode(): void {
    if (this.isEditing) {
      // If already editing, cancel and revert changes
      this.cancelEdit();
    } else {
      // Enter edit mode
      this.isEditing = true;
      // Make a copy of the original booking for potential cancellation
      this.originalBooking = { ...this.booking };
    }
  }

  // Cancel edit and revert changes
  cancelEdit(): void {
    this.isEditing = false;

    // Restore original values
    this.booking = { ...this.originalBooking };

    // If this is a new booking that was canceled, close the component
    if (this.isNewBooking) {
      this.closeBooking();
    }
  }

  // Save booking changes
  saveBooking(): void {
    if (!this.validateBooking()) {
      return;
    }

    this.isSubmitting = true;

    // Update the booking record in Firestore
    this.firestore.collection('bookings').doc(this.booking.id).set(this.booking)
      .then(() => {
        Swal.fire({
          title: 'Success',
          text: `Booking ${this.isNewBooking ? 'created' : 'updated'} successfully`,
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Exit edit mode
        this.isEditing = false;
        // Update the original booking copy
        this.originalBooking = { ...this.booking };
        // No longer a new booking
        this.isNewBooking = false;

        this.isSubmitting = false;
      })
      .catch(error => {
        console.error('Error saving booking:', error);
        Swal.fire({
          title: 'Error',
          text: `An error occurred while ${this.isNewBooking ? 'creating' : 'updating'} the booking`,
          icon: 'error',
          confirmButtonText: 'OK'
        });

        this.isSubmitting = false;
      });
  }

  // Validate booking before submission
  validateBooking(): boolean {
    // Required fields
    const requiredFields = ['bookDate', 'bookingStatus', 'genRegisterNumber'];
    const missingFields = requiredFields.filter(field => !this.booking[field]);

    if (missingFields.length > 0) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please fill in all required fields: ' + missingFields.join(', '),
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return false;
    }

    return true;
  }

  // Add a new charge
  addCharge(): void {
    this.isAddingCharge = true;
    this.newCharge = {
      id: this.firestore.createId(),
      bookingID: this.booking.id,
      offenderID: this.offender.id,
      unixDate: Date.now().toString()
    };
    this.selectedCrime = null;
    this.filteredCrimes = [];
  }

  // Filter crimes based on user input
  filterCrimes(event: any): void {
    const query = event.target.value.toLowerCase();

    // If the input is cleared, reset the selected crime
    if (!query) {
      this.selectedCrime = null;
      this.filteredCrimes = [];
      return;
    }

    // Only show dropdown if query is at least 2 characters
    if (query.length < 2) {
      this.filteredCrimes = [];
      return;
    }

    this.filteredCrimes = this.availableCrimes.filter(crime =>
      crime.value.toLowerCase().includes(query) ||
      crime.code.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results for better performance
  }

  // Select a crime from the autocomplete list
  selectCrime(crime: {code: string, value: string}): void {
    this.selectedCrime = crime;
    this.newCharge.countNo = crime.code;
    this.newCharge.countCharge = crime.value;
    this.newCharge.countComment = crime.value;
    this.filteredCrimes = [];
  }

  // Save a new charge
  saveCharge(): void {
    if (!this.validateCharge()) {
      return;
    }

    // Save the charge to Firestore
    this.firestore.collection('counts').doc(this.newCharge.id).set(this.newCharge)
      .then(() => {
        Swal.fire({
          title: 'Success',
          text: 'Charge added successfully',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Reset the new charge form
        this.isAddingCharge = false;
        this.newCharge = {};

        // Reload charges
        this.loadCharges();
      })
      .catch(error => {
        console.error('Error adding charge:', error);
        Swal.fire({
          title: 'Error',
          text: 'An error occurred while adding the charge',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
  }

  // Validate charge before submission
  validateCharge(): boolean {
    // Required fields
    const requiredFields = ['countNo', 'countCharge', 'countComment', 'severity'];
    const missingFields = requiredFields.filter(field => !this.newCharge[field]);

    if (missingFields.length > 0) {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please fill in all required fields: ' + missingFields.join(', '),
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return false;
    }

    return true;
  }

  // Cancel adding a charge
  cancelAddCharge(): void {
    this.isAddingCharge = false;
    this.newCharge = {};
  }

  // Delete a charge
  deleteCharge(charge: Count): void {
    Swal.fire({
      title: 'Delete Charge',
      text: 'Are you sure you want to delete this charge? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        // Delete the charge from Firestore
        this.firestore.collection('counts').doc(charge.id).delete()
          .then(() => {
            Swal.fire({
              title: 'Success',
              text: 'Charge deleted successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            });

            // Reload charges
            this.loadCharges();
          })
          .catch(error => {
            console.error('Error deleting charge:', error);
            Swal.fire({
              title: 'Error',
              text: 'An error occurred while deleting the charge',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });
      }
    });
  }

  // Format date from Unix timestamp
  dateFromUnixTime(unixTime: string | number): string {
    if (!unixTime) {
      return 'N/A';
    }

    const date = new Date(Number(unixTime));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Convert Unix timestamp to date string for input fields
  getDateValue(unixTime: string | number): string {
    if (!unixTime) {
      return '';
    }

    const date = new Date(Number(unixTime));
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  // Handle date input changes
  updateDate(fieldName: string, dateString: string): void {
    if (!dateString) {
      this.booking[fieldName] = null;
      return;
    }

    const timestamp = new Date(dateString).getTime();
    this.booking[fieldName] = timestamp;
  }

  // Load booking events from Firestore
  loadBookingEvents(): void {
    if (!this.booking.id) {
      return;
    }

    this.subscriptions.push(
      this.firestore.collection('BookingEvents', ref =>
        ref.where('bookingID', '==', this.booking.id)
        .orderBy('unixDate', 'desc')
      ).valueChanges().subscribe((events: BookingEvents[]) => {
        this.bookingEvents = events;
      })
    );
  }

  // Open document link in new tab
  openLink(link: string): void {
    window.open(link, "_blank");
  }

  // View note details
  viewNote(description: string): void {
    Swal.fire({
      title: 'Note',
      text: description,
      icon: 'info',
      confirmButtonText: 'Close'
    });
  }

  // Upload bail application
  doBailApplication(): void {
    Swal.fire({
      title: 'Select Bail Application',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your bail application'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const filePath = 'bail-applications/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          finalize(() => this.downloadURL = fileRef.getDownloadURL())
        );
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        this.downloadURL.subscribe((url: string) => {
          this.eventID = this.firestore.createId();
          this.firestore.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'bailApp',
            offenderID: this.booking.linkedOffenderID || this.booking.offender,
            offenderName: this.booking.offenderName || `${this.offender.lName}, ${this.offender.fName} ${this.offender.mName || ''}`.trim(),
            title: 'Bail Application',
            description: 'Bail Application Submitted by Defendant',
            disposition: 'pending',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
            unixDate: Date.now(),
          }).then(() => {
            Swal.fire({
              title: 'Bail Application Submitted',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
          });

          // Update the booking record
          this.firestore.collection('bookings').doc(this.booking.id).update({
            bailAppPending: true,
            bailAppSubmitedDate: Date.now(),
            bookingStatus: 'Open',
            bailStatus: '',
          });
        });
      }
    });
  }

  // Upload remand warrant
  doRemand(): void {
    Swal.fire({
      title: 'Select Remand Warrant PDF Document',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your PDF document'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          finalize(() => {
            this.downloadURL3 = fileRef.getDownloadURL();
          })
        );
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.downloadURL3.subscribe((url: string) => {
          this.eventID = this.firestore.createId();
          this.firestore.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'pdf',
            offenderID: this.booking.linkedOffenderID || this.booking.offender,
            offenderName: this.booking.offenderName || `${this.offender.lName}, ${this.offender.fName} ${this.offender.mName || ''}`.trim(),
            title: 'Remand Warrant',
            description: 'Booking Document',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
            unixDate: Date.now(),
          }).then(() => {
            Swal.fire({
              icon: 'success',
              title: 'Remand Warrant Uploaded',
              showConfirmButton: false,
              timer: 1500
            });
          });
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Remand Warrant Not Uploaded',
          showConfirmButton: false,
          timer: 1500
        });
      }
    });
  }

  // Upload general PDF document
  doPDFDocument(): void {
    Swal.fire({
      title: 'Select PDF Document',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf',
        'aria-label': 'Upload your PDF document'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: (file) => {
        const filePath = 'pdf-documents/' + this.booking.id + '-' + Date.now();
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, file);
        return task.snapshotChanges().pipe(
          finalize(() => {
            this.downloadURL2 = fileRef.getDownloadURL();
          })
        );
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.downloadURL2.subscribe((url: string) => {
          this.eventID = this.firestore.createId();
          this.firestore.collection('BookingEvents').doc(this.eventID).set({
            bookingID: this.booking.id,
            type: 'pdf',
            offenderID: this.booking.linkedOffenderID || this.booking.offender,
            offenderName: this.booking.offenderName || `${this.offender.lName}, ${this.offender.fName} ${this.offender.mName || ''}`.trim(),
            title: 'Booking Document (PDF)',
            description: 'Booking Document',
            status: 'active',
            link: url,
            date: new Date().toLocaleDateString('en-US'),
            unixDate: Date.now(),
          }).then(() => {
            Swal.fire({
              icon: 'success',
              title: 'PDF Document Uploaded',
              showConfirmButton: false,
              timer: 1500
            });
          });
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'PDF Document Not Uploaded',
          showConfirmButton: false,
          timer: 1500
        });
      }
    });
  }

  // Add a note
  doNote(): void {
    Swal.fire({
      title: 'Enter Note',
      input: 'text',
      inputAttributes: {
        'aria-label': 'Type your note here'
      },
      showCancelButton: true,
      confirmButtonText: 'Save',
      showLoaderOnConfirm: true,
      preConfirm: (note) => {
        this.eventID = this.firestore.createId();
        this.firestore.collection('BookingEvents').doc(this.eventID).set({
          bookingID: this.booking.id,
          type: 'note',
          offenderID: this.booking.linkedOffenderID || this.booking.offender,
          offenderName: this.booking.offenderName || `${this.offender.lName}, ${this.offender.fName} ${this.offender.mName || ''}`.trim(),
          title: 'Note',
          description: note,
          status: 'active',
          date: new Date().toLocaleDateString('en-US'),
          unixDate: Date.now(),
        }).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Note Saved',
            showConfirmButton: false,
            timer: 1500
          });
        });
      },
    });
  }

  // Change the active tab
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Close the booking component
  closeBooking(): void {
    // If there are unsaved changes, confirm before closing
    if (this.isEditing && JSON.stringify(this.booking) !== JSON.stringify(this.originalBooking)) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Close',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.close.emit();
        }
      });
    } else {
      this.close.emit();
    }
  }
}
