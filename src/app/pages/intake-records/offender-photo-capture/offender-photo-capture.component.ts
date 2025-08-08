import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Photos, PhotoTemplate } from '../../../models/photos';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CameraDialogComponent } from './camera-dialog/camera-dialog.component';
import { PhotoAssignmentDialogComponent } from './photo-assignment-dialog/photo-assignment-dialog.component';

@Component({
  selector: 'app-offender-photo-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './offender-photo-capture.component.html',
  styleUrl: './offender-photo-capture.component.scss'
})
export class OffenderPhotoCaptureComponent implements OnInit {
  @ViewChild('cameraFeed') cameraFeed: ElementRef;
  @ViewChild('snapshotCanvas') snapshotCanvas: ElementRef;
  @Input() offenderId: string;
  @Output() photoTaken = new EventEmitter<PhotoTemplate>();

  photoTypes = [
    { id: 'headFront', label: 'Head Front', placeholder: 'assets/img/placeholders/head-front.png' },
    { id: 'headLeft', label: 'Head Left', placeholder: 'assets/img/placeholders/head-left.png' },
    { id: 'headRight', label: 'Head Right', placeholder: 'assets/img/placeholders/head-right.png' },
    { id: 'bodyFront', label: 'Full Body Front', placeholder: 'assets/img/placeholders/body-front.png' },
    { id: 'bodyLeft', label: 'Full Body Left', placeholder: 'assets/img/placeholders/body-left.png' },
    { id: 'bodyRight', label: 'Full Body Right', placeholder: 'assets/img/placeholders/body-right.png' },
    { id: 'custom1', label: 'Custom 1 (Scars, Marks, Tattoos)', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom2', label: 'Custom 2 (Scars, Marks, Tattoos)', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom3', label: 'Custom 3 (Scars, Marks, Tattoos)', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom4', label: 'Custom 4 (Scars, Marks, Tattoos)', placeholder: 'assets/img/placeholders/custom.png' }
  ];

  // Group photo types into rows
  standardPhotoTypes = this.photoTypes.slice(0, 6); // Head and body photos
  customPhotoTypes = this.photoTypes.slice(6); // Custom photos for scars, marks, tattoos

  // Store offender photos
  offenderPhotos: { [key: string]: string } = {};
  unassignedPhotos: PhotoTemplate[] = [];
  hasPhotos: boolean = false;

  selectedPhotoType: string = '';
  photoComment: string = '';
  isMainPhoto: boolean = false;
  snapshotDataUrl: string | null = null;
  private stream: MediaStream | null = null;
  private dialogCameraFeed: HTMLVideoElement | null = null;

  constructor(
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Optional() public dialogRef: MatDialogRef<OffenderPhotoCaptureComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: any
  ) {
    // If component is opened as a dialog, get offenderId from dialog data
    if (this.dialogData && this.dialogData.offenderId) {
      this.offenderId = this.dialogData.offenderId;
    }
  }

  /**
   * Closes the dialog
   */
  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  ngOnInit(): void {
    console.log('OffenderPhotoCaptureComponent initialized with offenderId:', this.offenderId);
    if (this.offenderId) {
      this.loadOffenderPhotos();
    } else {
      console.error('No offenderId provided to OffenderPhotoCaptureComponent');
    }
  }

  loadOffenderPhotos(): void {
    console.log('Loading photos for offenderId:', this.offenderId);

    if (!this.offenderId) {
      console.error('Cannot load photos: offenderId is undefined or null');
      return;
    }

    // Initialize all photo types with their specific placeholders
    this.photoTypes.forEach(type => {
      this.offenderPhotos[type.id] = type.placeholder;
    });

    // Create a container for unassigned photos
    this.unassignedPhotos = [];

    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      console.log('Photos query returned', snapshot.size, 'documents');

      if (!snapshot.empty) {
        const photosDoc = snapshot.docs[0].data() as Photos;
        console.log('Photos document:', photosDoc);

        if (photosDoc.photos && photosDoc.photos.length > 0) {
          console.log('Found', photosDoc.photos.length, 'photos for offender');
          this.hasPhotos = true;

          // Map photos to their types based on photoShot field
          photosDoc.photos.forEach(photo => {
            if (photo.photoUrl) {
              console.log('Processing photo:', photo);

              if (photo.photoShot) {
                // If photoShot is set, use it to determine the photo type
                switch (photo.photoShot) {
                  case 'Head Front':
                    this.offenderPhotos['headFront'] = photo.photoUrl;
                    console.log('Assigned Head Front photo');
                    break;
                  case 'Head Left':
                    this.offenderPhotos['headLeft'] = photo.photoUrl;
                    console.log('Assigned Head Left photo');
                    break;
                  case 'Head Right':
                    this.offenderPhotos['headRight'] = photo.photoUrl;
                    console.log('Assigned Head Right photo');
                    break;
                  case 'Full Body Front':
                    this.offenderPhotos['bodyFront'] = photo.photoUrl;
                    console.log('Assigned Full Body Front photo');
                    break;
                  case 'Full Body Left':
                    this.offenderPhotos['bodyLeft'] = photo.photoUrl;
                    console.log('Assigned Full Body Left photo');
                    break;
                  case 'Full Body Right':
                    this.offenderPhotos['bodyRight'] = photo.photoUrl;
                    console.log('Assigned Full Body Right photo');
                    break;
                  case 'Custom 1 (Scars, Marks, Tattoos)':
                    this.offenderPhotos['custom1'] = photo.photoUrl;
                    console.log('Assigned Custom 1 photo');
                    break;
                  case 'Custom 2 (Scars, Marks, Tattoos)':
                    this.offenderPhotos['custom2'] = photo.photoUrl;
                    console.log('Assigned Custom 2 photo');
                    break;
                  case 'Custom 3 (Scars, Marks, Tattoos)':
                    this.offenderPhotos['custom3'] = photo.photoUrl;
                    console.log('Assigned Custom 3 photo');
                    break;
                  case 'Custom 4 (Scars, Marks, Tattoos)':
                    this.offenderPhotos['custom4'] = photo.photoUrl;
                    console.log('Assigned Custom 4 photo');
                    break;
                  default:
                    // If photoShot doesn't match any known type, add to unassigned
                    this.unassignedPhotos.push(photo);
                    console.log('Added photo to unassigned (unknown photoShot):', photo.photoShot);
                }
              } else if (photo.photoMain) {
                // If photo is marked as main but doesn't have photoShot, assign it to Head Front
                this.offenderPhotos['headFront'] = photo.photoUrl;
                console.log('Assigned main photo to Head Front');
                // Update the photo in the database to set photoShot
                this.updatePhotoShot(photo, 'Head Front');
              } else {
                // If no photoShot is set, add to unassigned photos
                this.unassignedPhotos.push(photo);
                console.log('Added photo to unassigned (no photoShot)');
              }
            } else {
              console.warn('Skipping photo with no URL:', photo);
            }
          });
        } else {
          console.log('No photos found in the document or photos array is empty');
        }
      } else {
        console.log('No photos document found for this offender');
      }
    }, error => {
      console.error('Error loading offender photos:', error);
      this.snackBar.open('Error loading photos. Please try again.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    });
  }

  updatePhotoShot(photo: PhotoTemplate, photoShot: string): void {
    // Find the photo document
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const photosDoc = snapshot.docs[0].data() as Photos;

        if (photosDoc.photos) {
          // Find the photo in the array and update its photoShot
          const updatedPhotos = photosDoc.photos.map(p => {
            if (p.photoUrl === photo.photoUrl && p.photoDate === photo.photoDate) {
              return { ...p, photoShot };
            }
            return p;
          });

          // Update the document
          this.firestore.collection('photos').doc(docId).update({
            photos: updatedPhotos
          }).catch(error => {
            console.error('Error updating photo shot type:', error);
          });
        }
      }
    });
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (this.cameraFeed && this.cameraFeed.nativeElement) {
        this.cameraFeed.nativeElement.srcObject = this.stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Show error using Material dialog instead of Swal
      this.dialog.open(CameraDialogComponent, {
        width: '400px',
        data: {
          error: 'Unable to access the camera. Please check your permissions.'
        }
      });
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  takeSnapshot() {
    if (this.stream && this.cameraFeed && this.snapshotCanvas) {
      const canvas = this.snapshotCanvas.nativeElement;
      const video = this.cameraFeed.nativeElement;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      this.snapshotDataUrl = canvas.toDataURL('image/jpeg');
    }
  }

  savePhoto() {
    if (!this.snapshotDataUrl) {
      // Use Material dialog instead of Swal
      this.dialog.open(CameraDialogComponent, {
        width: '400px',
        data: {
          error: 'Please take a photo first'
        }
      });
      return;
    }

    if (!this.photoComment) {
      // Use Material dialog instead of Swal
      this.dialog.open(CameraDialogComponent, {
        width: '400px',
        data: {
          error: 'Please add a comment for this photo'
        }
      });
      return;
    }

    // Get the selected photo type label to include in the comment
    const selectedType = this.photoTypes.find(type => type.id === this.selectedPhotoType);
    const typeLabel = selectedType ? selectedType.label : '';

    // Include the photo type in the comment
    const commentWithType = `${typeLabel}: ${this.photoComment}`;

    const newPhoto: PhotoTemplate = {
      photoUrl: this.snapshotDataUrl,
      photoComment: commentWithType,
      photoMain: this.isMainPhoto,
      photoDate: new Date().toISOString()
    };

    // Update the local photo collection for immediate display
    this.offenderPhotos[this.selectedPhotoType] = this.snapshotDataUrl;

    this.photoTaken.emit(newPhoto);
    this.resetForm();
  }

  resetForm() {
    this.snapshotDataUrl = null;
    this.photoComment = '';
    this.isMainPhoto = false;
  }

  cancelCapture() {
    this.stopCamera();
    this.resetForm();
    // No need to close Swal dialog anymore
  }

  getSelectedPhotoTypeLabel(): string {
    const selectedType = this.photoTypes.find(type => type.id === this.selectedPhotoType);
    return selectedType ? selectedType.label : '';
  }

  hasPhotoForType(typeId: string): boolean {
    const type = this.photoTypes.find(t => t.id === typeId);
    return this.offenderPhotos[typeId] && type && this.offenderPhotos[typeId] !== type.placeholder;
  }

  assignPhoto(photo: PhotoTemplate): void {
    // Open the Angular Material dialog with the PhotoAssignmentDialogComponent
    const dialogRef = this.dialog.open(PhotoAssignmentDialogComponent, {
      width: '400px',
      maxHeight: '90vh',
      data: {
        photo: photo,
        photoTypes: this.photoTypes
      }
    });

    // Subscribe to the dialog close event
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const { typeId, isMain } = result;
        const selectedType = this.photoTypes.find(type => type.id === typeId);

        if (selectedType) {
          // Update the photo with the selected type
          const updatedPhoto = { ...photo, photoShot: selectedType.label, photoMain: isMain };

          // Update the photo in the database
          this.updatePhotoAssignment(photo, updatedPhoto);

          // Update the UI
          this.offenderPhotos[typeId] = photo.photoUrl;

          // Remove from unassigned photos
          this.unassignedPhotos = this.unassignedPhotos.filter(p =>
            p.photoUrl !== photo.photoUrl || p.photoDate !== photo.photoDate
          );

          // If set as main photo and it's a Head Front, update the UI to show it's the main photo
          if (isMain && typeId === 'headFront') {
            // Add visual indicator for main photo
            this.markHeadFrontAsMain();
          }

          // Show success message using MatSnackBar
          this.snackBar.open('Photo assigned successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        }
      }
    });
  }

  updatePhotoAssignment(oldPhoto: PhotoTemplate, updatedPhoto: PhotoTemplate): void {
    // Find the photo document
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const photosDoc = snapshot.docs[0].data() as Photos;

        if (photosDoc.photos) {
          // Find the photo in the array and update it
          const updatedPhotos = photosDoc.photos.map(p => {
            if (p.photoUrl === oldPhoto.photoUrl && p.photoDate === oldPhoto.photoDate) {
              return updatedPhoto;
            }
            return p;
          });

          // Update the document
          this.firestore.collection('photos').doc(docId).update({
            photos: updatedPhotos
          }).then(() => {
            // If this photo is being assigned as Head Front and set as main photo,
            // update the offender record
            if (updatedPhoto.photoShot === 'Head Front' && updatedPhoto.photoMain && updatedPhoto.photoUrl) {
              this.updateOffenderMainPhoto(updatedPhoto.photoUrl);
            }
          }).catch(error => {
            console.error('Error updating photo assignment:', error);
          });
        }
      }
    });
  }

  markHeadFrontAsMain(): void {
    // This method ensures the Head Front photo is marked as the main photo
    // and updates the database accordingly

    // Find the photo document
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const photosDoc = snapshot.docs[0].data() as Photos;

        if (photosDoc.photos) {
          // Find the Head Front photo
          let headFrontPhoto: PhotoTemplate | null = null;

          // Update all photos: set photoMain=true for Head Front, false for others
          const updatedPhotos = photosDoc.photos.map(p => {
            if (p.photoShot === 'Head Front') {
              headFrontPhoto = p;
              return { ...p, photoMain: true };
            } else {
              return { ...p, photoMain: false };
            }
          });

          // Update the document
          this.firestore.collection('photos').doc(docId).update({
            photos: updatedPhotos
          }).then(() => {
            // If we found a Head Front photo, update the offender record
            if (headFrontPhoto && headFrontPhoto.photoUrl) {
              this.updateOffenderMainPhoto(headFrontPhoto.photoUrl);
            }
          }).catch(error => {
            console.error('Error updating main photo:', error);
          });
        }
      }
    });
  }

  // Update the main photo in the offender record
  private updateOffenderMainPhoto(photoUrl: string): void {
    // Update the offender record with the new photo URL
    this.firestore.collection('users').doc(this.offenderId).update({
      mainPhoto: photoUrl
    }).then(() => {
      console.log('Offender main photo updated successfully');
    }).catch(error => {
      console.error('Error updating offender main photo:', error);
    });
  }

  openCameraDialog(photoTypeId: string): void {
    this.selectedPhotoType = photoTypeId;

    // Get the photo type label
    const photoTypeLabel = this.getSelectedPhotoTypeLabel();

    // Open the Angular Material dialog
    const dialogRef = this.dialog.open(CameraDialogComponent, {
      width: '600px',
      maxHeight: '90vh', // Set maximum height to 90% of viewport height
      disableClose: false,
      autoFocus: false, // Prevent auto focus which can cause scrolling issues
      data: {
        photoTypeId: photoTypeId,
        photoTypeLabel: photoTypeLabel,
        offenderId: this.offenderId
      }
    });

    // Subscribe to the dialog close event
    dialogRef.afterClosed().subscribe(result => {
      if (result && !result.error) {
        // If we have a result (not cancelled)
        if (result.photoUrl) {
          // Update the local photo collection for immediate display
          this.offenderPhotos[photoTypeId] = result.photoUrl;

          // Get the selected photo type label to include in the comment
          const selectedType = this.photoTypes.find(type => type.id === photoTypeId);
          const typeLabel = selectedType ? selectedType.label : '';

          // Include the photo type in the comment if not already included
          let commentWithType = result.photoComment;
          if (!commentWithType.toLowerCase().includes(typeLabel.toLowerCase())) {
            commentWithType = `${typeLabel}: ${result.photoComment}`;
          }

          // Create the photo template
          const newPhoto: PhotoTemplate = {
            photoUrl: result.photoUrl,
            photoComment: commentWithType,
            photoMain: result.photoMain,
            photoDate: result.photoDate || new Date().toISOString(),
            photoShot: result.photoShot || selectedType.label
          };

          // Emit the photo taken event
          this.photoTaken.emit(newPhoto);
        }
      } else if (result && result.error) {
        // Handle any errors
        console.error('Camera dialog error:', result.error);
      }
    });
  }

}
