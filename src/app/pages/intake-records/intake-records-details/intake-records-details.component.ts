import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Subscription } from 'rxjs';
import { Offender } from '../../../models/offender';
import { Booking } from '../../../models/booking';
import Swal from 'sweetalert2';

interface TimelineEvent {
  status: string;
  bookDate: string | number;
  icon: string;
  bookingStatus: string;
  bailAppPending: boolean;
  bailAppSubmitedDate: string;
  attorneyName: string;
  genRegisterNumber: string;
  judgeAssigned: string;
  judgeAssignedDate: string;
  hearingAssignDate: string;
  lastBailHearingDate: string;
  id: string;
}

@Component({
  selector: 'app-intake-records-details',
  templateUrl: './intake-records-details.component.html',
  styleUrls: ['./intake-records-details.component.scss']
})
export class IntakeRecordsDetailsComponent implements OnInit, OnDestroy {
  @Input() offender: Offender = {};
  @Output() bookingSelected = new EventEmitter<Booking>();
  @Output() createBooking = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // Offender state
  isEditing: boolean = false;
  originalOffender: Offender = {};

  // Bookings
  bookings: Booking[] = [];
  events: TimelineEvent[] = [];

  // Photo handling
  selectedPhoto: File | null = null;
  photoURL: string = '';
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) { }

  ngOnInit(): void {
    // Make a copy of the original offender for potential cancellation
    this.originalOffender = { ...this.offender };

    // Load bookings for this offender
    this.loadBookings();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Load bookings for the current offender
  loadBookings(): void {
    if (!this.offender.id) {
      return;
    }

    // Query using the 'offender' field which is used in the original component
    this.subscriptions.push(
      this.firestore.collection('bookings', ref =>
        ref.where('offender', '==', this.offender.id)
        .orderBy('bookDate', 'desc')
      ).valueChanges().subscribe((bookings: any[]) => {
        this.bookings = bookings;
        this.createTimelineEvents();

        // If no bookings found with 'offender' field, try with 'linkedOffenderID' as fallback
        if (bookings.length === 0) {
          this.subscriptions.push(
            this.firestore.collection('bookings', ref =>
              ref.where('linkedOffenderID', '==', this.offender.id)
              .orderBy('bookDate', 'desc')
            ).valueChanges().subscribe((linkedBookings: any[]) => {
              if (linkedBookings.length > 0) {
                this.bookings = linkedBookings;
                this.createTimelineEvents();
              }
            })
          );
        }
      })
    );
  }

  // Create timeline events from bookings
  createTimelineEvents(): void {
    this.events = this.bookings.map(booking => {
      return {
        status: `Booking #${booking.genRegisterNumber || 'N/A'}`,
        bookDate: booking.bookDate || Date.now(),
        icon: 'pi pi-calendar',
        bookingStatus: booking.bookingStatus || 'Open',
        bailAppPending: booking.bailAppPending || false,
        bailAppSubmitedDate: booking.bailAppSubmitedDate || '',
        attorneyName: booking.attorneyName || '',
        genRegisterNumber: booking.genRegisterNumber || '',
        judgeAssigned: booking.judgeAssigned || '',
        judgeAssignedDate: booking.judgeAssignedDate || '',
        hearingAssignDate: booking.hearingAssignDate || '',
        lastBailHearingDate: '',
        id: booking.id || ''
      };
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

  // Toggle edit mode
  toggleEditMode(): void {
    if (this.isEditing) {
      // If already editing, cancel and revert changes
      this.cancelEdit();
    } else {
      // Enter edit mode
      this.isEditing = true;
      // Make a copy of the original offender for potential cancellation
      this.originalOffender = { ...this.offender };
    }
  }

  // Cancel edit and revert changes
  cancelEdit(): void {
    this.isEditing = false;
    // Restore original values
    this.offender = { ...this.originalOffender };
  }

  // Save offender changes
  saveOffender(): void {
    if (!this.offender.id) {
      return;
    }

    Swal.fire({
      title: 'Save Changes',
      text: 'Are you sure you want to save these changes?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Save Changes',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Update the offender record in Firestore
        this.firestore.collection('users').doc(this.offender.id).update(this.offender)
          .then(() => {
            Swal.fire({
              title: 'Success',
              text: 'Offender record updated successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            });

            // Exit edit mode
            this.isEditing = false;
            // Update the original offender copy
            this.originalOffender = { ...this.offender };
          })
          .catch(error => {
            console.error('Error updating offender:', error);
            Swal.fire({
              title: 'Error',
              text: 'An error occurred while updating the offender record',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });
      }
    });
  }

  // Handle photo selection
  onPhotoSelected(event: any): void {
    if (event.target.files && event.target.files[0]) {
      this.selectedPhoto = event.target.files[0];

      // Create a preview of the selected photo
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoURL = e.target.result;
      };
      reader.readAsDataURL(this.selectedPhoto);
    }
  }

  // Update offender photo
  updatePhoto(): void {
    if (!this.selectedPhoto || !this.offender.id) {
      return;
    }

    this.isUploading = true;

    // Create a reference to the storage location
    const filePath = `offender-photos/${this.offender.id}/${Date.now()}_${this.selectedPhoto.name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, this.selectedPhoto);

    // Monitor upload progress
    this.subscriptions.push(
      task.percentageChanges().subscribe(progress => {
        this.uploadProgress = progress || 0;
      })
    );

    // Get the download URL when upload is complete
    task.then(() => {
      this.subscriptions.push(
        fileRef.getDownloadURL().subscribe(url => {
          // Update the offender record with the new photo URL
          this.offender.mainPhoto = url;

          // Save the updated offender record
          this.firestore.collection('users').doc(this.offender.id).update({
            mainPhoto: url
          }).then(() => {
            Swal.fire({
              title: 'Success',
              text: 'Photo updated successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            });

            this.isUploading = false;
            this.selectedPhoto = null;
            this.photoURL = '';
            this.uploadProgress = 0;
          }).catch(error => {
            console.error('Error updating photo URL:', error);
            Swal.fire({
              title: 'Error',
              text: 'An error occurred while updating the photo',
              icon: 'error',
              confirmButtonText: 'OK'
            });

            this.isUploading = false;
          });
        }, error => {
          console.error('Error getting download URL:', error);
          Swal.fire({
            title: 'Error',
            text: 'An error occurred while uploading the photo',
            icon: 'error',
            confirmButtonText: 'OK'
          });

          this.isUploading = false;
        })
      );
    }).catch(error => {
      console.error('Error uploading photo:', error);
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while uploading the photo',
        icon: 'error',
        confirmButtonText: 'OK'
      });

      this.isUploading = false;
    });
  }

  // View a booking
  viewBooking(event: TimelineEvent): void {
    const booking = this.bookings.find(b => b.id === event.id);
    if (booking) {
      this.bookingSelected.emit(booking);
    }
  }

  // Add a new booking
  addBooking(): void {
    this.createBooking.emit();
  }

  // Delete a booking
  deleteBooking(event: TimelineEvent): void {
    Swal.fire({
      title: 'Delete Booking',
      text: 'Are you sure you want to delete this booking? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        // Delete the booking from Firestore
        this.firestore.collection('bookings').doc(event.id).delete()
          .then(() => {
            Swal.fire({
              title: 'Success',
              text: 'Booking deleted successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            });
          })
          .catch(error => {
            console.error('Error deleting booking:', error);
            Swal.fire({
              title: 'Error',
              text: 'An error occurred while deleting the booking',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });
      }
    });
  }

  // Close the details view
  closeDetails(): void {
    this.close.emit();
  }
}
