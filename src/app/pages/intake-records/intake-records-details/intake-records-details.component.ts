import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, createComponent, EnvironmentInjector, ApplicationRef } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Offender } from '../../../models/offender';
import { Booking } from '../../../models/booking';
import { Photos, PhotoTemplate } from '../../../models/photos';
import { Afis } from '../../../models/afis';
import { OffenderPhotoCaptureComponent } from '../offender-photo-capture/offender-photo-capture.component';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import firebase from 'firebase/compat/app';

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

  // AFIS records
  afisRecords: Afis[] = [];
  isLoadingAfis: boolean = false;
  afisError: string | null = null;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private environmentInjector: EnvironmentInjector,
    private appRef: ApplicationRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Make a copy of the original offender for potential cancellation
    this.originalOffender = { ...this.offender };
    console.log("offender", this.offender);

    // Load bookings for this offender
    this.loadBookings();

    // Fetch AFIS records for this offender
    this.fetchAfisRecords();

    // Add a snapshot listener for the offender document to track mainPhoto changes
    if (this.offender.id) {
      this.subscriptions.push(
        this.firestore.doc(`users/${this.offender.id}`).snapshotChanges().subscribe(snapshot => {
          if (snapshot.payload.exists) {
            const offenderData = snapshot.payload.data() as Offender;
            if (offenderData.mainPhoto !== this.offender.mainPhoto) {
              console.log('Offender mainPhoto updated:', offenderData.mainPhoto);
              this.offender.mainPhoto = offenderData.mainPhoto;
            }
          }
        })
      );
    }
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

  // Open photo capture dialog
  openPhotoCapture() {
    // Open the Angular Material dialog with the OffenderPhotoCaptureComponent
    const dialogRef = this.dialog.open(OffenderPhotoCaptureComponent, {
      width: '80%',
      maxWidth: '1000px',
      maxHeight: '90vh', // Set maximum height to 90% of viewport height
      disableClose: false,
      autoFocus: false, // Prevent auto focus which can cause scrolling issues
      data: {
        offenderId: this.offender.id
      }
    });

    // Subscribe to the dialog close event
    dialogRef.componentInstance.photoTaken.subscribe((photo: PhotoTemplate) => {
      this.handlePhotoTaken(photo);
    });
  }

  // Handle photo taken from the photo capture component
  handlePhotoTaken(photo: PhotoTemplate) {
    // Convert data URL to Blob
    const blob = this.dataURLtoBlob(photo.photoUrl);

    // Generate timestamp for the filename
    const timestamp = Date.now();

    // Create the filename according to the specified format
    const filename = `${this.offender.id}-${timestamp}-mainPhoto.png`;

    // Create a reference to the storage location
    const filePath = `mainPhotos/${filename}`;
    const fileRef = this.storage.ref(filePath);

    // Upload the photo to Firebase Storage
    const task = this.storage.upload(filePath, blob);

    // Monitor upload progress
    task.percentageChanges().subscribe(progress => {
      console.log(`Upload progress: ${progress}%`);
    });

    // Get the download URL when upload is complete
    task.then(() => {
      fileRef.getDownloadURL().subscribe(url => {
        // Update the photo URL with the Firebase Storage URL
        const updatedPhoto: PhotoTemplate = {
          ...photo,
          photoUrl: url,
          photoDate: new Date(timestamp).toISOString()
        };

        // Save the photo to Firestore
        if (updatedPhoto.photoMain || (updatedPhoto.photoShot === 'Head Front')) {
          this.updateMainPhoto(url);
        }

        // Always save to the photos collection
        this.saveOffenderPhoto(updatedPhoto);
      });
    }).catch(error => {
      console.error('Error uploading photo:', error);
      Swal.fire({
        title: 'Error',
        text: 'There was an error uploading the photo: ' + error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  // Convert data URL to Blob
  dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  // Update the main photo of the offender
  updateMainPhoto(photoUrl: string) {
    // Update the offender record with the new photo URL
    this.firestore.collection('users').doc(this.offender.id).update({
      mainPhoto: photoUrl
    }).then(() => {
      Swal.fire({
        title: 'Main Photo Updated',
        text: 'The offender main photo has been updated successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    }).catch(error => {
      Swal.fire({
        title: 'Error',
        text: 'There was an error updating the offender photo: ' + error.message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  // Save an offender photo to the photos collection
  saveOffenderPhoto(photo: PhotoTemplate) {
    // Ensure photoShot is set for Head Front if it's the main photo
    if (photo.photoMain && !photo.photoShot) {
      photo.photoShot = 'Head Front';
    }

    // Check if there's an existing photos document for this offender
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offender.id)
    ).get().subscribe(snapshot => {
      if (snapshot.empty) {
        // Create a new photos document
        const newPhotos: Photos = {
          offenderID: this.offender.id,
          photos: [photo]
        };

        this.firestore.collection('photos').add(newPhotos)
          .then(() => {
            // If this is a Head Front photo, ensure the offender record is updated
            if (photo.photoShot === 'Head Front' && photo.photoUrl) {
              this.updateMainPhoto(photo.photoUrl);
            } else {
              Swal.fire({
                title: 'Photo Saved',
                text: 'The offender photo has been saved successfully',
                icon: 'success',
                confirmButtonText: 'OK'
              });
            }
          })
          .catch(error => {
            Swal.fire({
              title: 'Error',
              text: 'There was an error saving the photo: ' + error.message,
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });
      } else {
        // Update the existing photos document
        const docId = snapshot.docs[0].id;
        const existingPhotos = snapshot.docs[0].data() as Photos;

        if (!existingPhotos.photos) {
          existingPhotos.photos = [];
        }

        // Check if we need to update an existing photo of the same type
        let photoUpdated = false;
        let oldPhotoUrl: string | undefined;

        if (photo.photoShot) {
          // If this photo has a type, check if we should update an existing one
          const updatedPhotos = existingPhotos.photos.map(p => {
            if (p.photoShot === photo.photoShot) {
              // Store the old photo URL for deletion
              if (p.photoUrl && p.photoUrl !== photo.photoUrl) {
                oldPhotoUrl = p.photoUrl;
                console.log('Found old photo to replace:', oldPhotoUrl);
              }

              // Update existing photo of the same type
              photoUpdated = true;
              return photo;
            }
            // If this is a new main photo, ensure no other photos are marked as main
            if (photo.photoMain && p.photoMain) {
              return { ...p, photoMain: false };
            }
            return p;
          });

          if (photoUpdated) {
            // If we updated an existing photo, use the updated array
            existingPhotos.photos = updatedPhotos;

            // Delete the old photo from storage if it exists
            if (oldPhotoUrl) {
              this.deletePhotoFromStorage(oldPhotoUrl);
            }
          } else {
            // Otherwise add the new photo
            existingPhotos.photos.push(photo);
          }
        } else {
          // If no photoShot is set, just add it as a new photo
          existingPhotos.photos.push(photo);
        }

        this.firestore.collection('photos').doc(docId).update(existingPhotos)
          .then(() => {
            // If this is a Head Front photo, ensure the offender record is updated
            if (photo.photoShot === 'Head Front' && photo.photoUrl) {
              this.updateMainPhoto(photo.photoUrl);
            } else {
              Swal.fire({
                title: 'Photo Saved',
                text: 'The offender photo has been saved successfully',
                icon: 'success',
                confirmButtonText: 'OK'
              });
            }
          })
          .catch(error => {
            Swal.fire({
              title: 'Error',
              text: 'There was an error saving the photo: ' + error.message,
              icon: 'error',
              confirmButtonText: 'OK'
            });
          });
      }
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

  // Fetch AFIS records for the current offender
  fetchAfisRecords(): void {
    // Only proceed if we have the necessary information
    if (!this.offender.lName || !this.offender.dob) {
      this.afisError = "Missing last name or date of birth required for AFIS search";
      return;
    }

    this.isLoadingAfis = true;
    this.afisError = null;

    // Format the last name and DOB for the AFIS API (exactly like intake-records-search)
    const trimmedLastName = this.offender.lName.trim();
    const formattedLastName = trimmedLastName.charAt(0).toUpperCase() + trimmedLastName.slice(1).toLowerCase();
    const date = new Date(this.offender.dob + 'T00:00:00');
    const formattedDOB = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const encodedDOB = encodeURIComponent(formattedDOB);

    // Call the AFIS API
    this.http.get<Afis[]>(`https://us-central1-bbms-1283c.cloudfunctions.net/afis/getOffenderByName/${formattedLastName}/${encodedDOB}`)
      .pipe(take(1))
      .subscribe({
        next: (results) => {
          // Sort results by datetime (newest first)
          this.afisRecords = results.sort((a, b) => {
            return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
          });
          this.isLoadingAfis = false;
        },
        error: (error) => {
          console.error('Error fetching AFIS records:', error);
          this.afisError = "Error fetching AFIS records. Please try again.";
          this.isLoadingAfis = false;
        }
      });
  }

  // Link AFIS record to offender
  linkToAfisRecord(): void {
    if (this.afisRecords.length === 0) {
      return;
    }

    // Get the newest AFIS record
    const newestRecord = this.afisRecords[0];

    if (!newestRecord.id) {
      Swal.fire({
        title: 'Error',
        text: 'The AFIS record does not have a valid ID',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Update the offender's SPN with the AFIS ID
    this.offender.spn = newestRecord.id;

    // Save the updated offender
    if (this.offender.id) {
      this.firestore.collection('users').doc(this.offender.id).update({
        spn: newestRecord.id
      }).then(() => {
        // Show success dialog
        Swal.fire({
          title: 'Success',
          text: 'Record has now been linked to the AFIS',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }).catch(error => {
        console.error('Error linking to AFIS record:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to link to AFIS record. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    }
  }

  // Delete a photo from Firebase Storage
  private deletePhotoFromStorage(photoUrl: string): void {
    try {
      // Extract the file path from the URL
      // Firebase Storage URLs typically look like:
      // https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?token=[token]
      const decodedUrl = decodeURIComponent(photoUrl);
      const startIndex = decodedUrl.indexOf('/o/') + 3;
      const endIndex = decodedUrl.indexOf('?');

      if (startIndex > 2 && endIndex > startIndex) {
        const filePath = decodedUrl.substring(startIndex, endIndex);
        console.log('Deleting file from storage:', filePath);

        // Create a reference to the file and delete it
        const fileRef = this.storage.ref(filePath);
        fileRef.delete().subscribe(
          () => {
            console.log('Old photo deleted successfully from storage');
          },
          error => {
            console.error('Error deleting old photo from storage:', error);
          }
        );
      } else {
        console.warn('Could not parse file path from URL:', photoUrl);
      }
    } catch (error) {
      console.error('Error in deletePhotoFromStorage:', error);
    }
  }
}
