import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Photos, PhotoTemplate } from '../../../models/photos';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CameraDialogComponent } from './camera-dialog/camera-dialog.component';
import { PhotoAssignmentDialogComponent } from './photo-assignment-dialog/photo-assignment-dialog.component';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';

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
  @Output() close = new EventEmitter<void>();

  // Organized photo types by category
  headPhotoTypes = [
    { id: 'headFront', label: 'Front (Main)', placeholder: 'assets/img/placeholders/head-front.png' },
    { id: 'headLeft', label: 'Left Profile', placeholder: 'assets/img/placeholders/head-left.png' },
    { id: 'headRight', label: 'Right Profile', placeholder: 'assets/img/placeholders/head-right.png' }
  ];

  bodyPhotoTypes = [
    { id: 'bodyFront', label: 'Front', placeholder: 'assets/img/placeholders/body-front.png' },
    { id: 'bodyLeft', label: 'Left Side', placeholder: 'assets/img/placeholders/body-left.png' },
    { id: 'bodyRight', label: 'Right Side', placeholder: 'assets/img/placeholders/body-right.png' }
  ];

  customPhotoTypes = [
    { id: 'custom1', label: 'Mark 1', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom2', label: 'Mark 2', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom3', label: 'Mark 3', placeholder: 'assets/img/placeholders/custom.png' },
    { id: 'custom4', label: 'Mark 4', placeholder: 'assets/img/placeholders/custom.png' }
  ];

  // Combined list for backward compatibility
  photoTypes = [...this.headPhotoTypes, ...this.bodyPhotoTypes, ...this.customPhotoTypes];

  // Store offender photos
  offenderPhotos: { [key: string]: string } = {};
  unassignedPhotos: PhotoTemplate[] = [];
  hasPhotos: boolean = false;

  // Upload progress tracking
  uploadingPhotoType: string | null = null;
  uploadProgress: number = 0;

  selectedPhotoType: string = '';
  photoComment: string = '';
  isMainPhoto: boolean = false;
  snapshotDataUrl: string | null = null;
  private stream: MediaStream | null = null;

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Optional() public dialogRef: MatDialogRef<OffenderPhotoCaptureComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: any
  ) {
    if (this.dialogData && this.dialogData.offenderId) {
      this.offenderId = this.dialogData.offenderId;
    }
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      // Emit close event when used as a component (not dialog)
      this.close.emit();
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

  // Progress calculation methods
  getHeadShotsCompleted(): number {
    return this.headPhotoTypes.filter(type => this.hasPhotoForType(type.id)).length;
  }

  getHeadShotsProgress(): number {
    return (this.getHeadShotsCompleted() / 3) * 100;
  }

  getBodyShotsCompleted(): number {
    return this.bodyPhotoTypes.filter(type => this.hasPhotoForType(type.id)).length;
  }

  getBodyShotsProgress(): number {
    return (this.getBodyShotsCompleted() / 3) * 100;
  }

  getMarksShotsCompleted(): number {
    return this.customPhotoTypes.filter(type => this.hasPhotoForType(type.id)).length;
  }

  getMarksShotsProgress(): number {
    return (this.getMarksShotsCompleted() / 4) * 100;
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

          photosDoc.photos.forEach(photo => {
            if (photo.photoUrl) {
              this.assignPhotoToType(photo);
            }
          });
        }
      }
    }, error => {
      console.error('Error loading offender photos:', error);
      this.snackBar.open('Error loading photos. Please try again.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    });
  }

  private assignPhotoToType(photo: PhotoTemplate): void {
    if (photo.photoShot) {
      switch (photo.photoShot) {
        case 'Head Front':
        case 'Front (Main)':
          this.offenderPhotos['headFront'] = photo.photoUrl;
          break;
        case 'Head Left':
        case 'Left Profile':
          this.offenderPhotos['headLeft'] = photo.photoUrl;
          break;
        case 'Head Right':
        case 'Right Profile':
          this.offenderPhotos['headRight'] = photo.photoUrl;
          break;
        case 'Full Body Front':
        case 'Front':
          this.offenderPhotos['bodyFront'] = photo.photoUrl;
          break;
        case 'Full Body Left':
        case 'Left Side':
          this.offenderPhotos['bodyLeft'] = photo.photoUrl;
          break;
        case 'Full Body Right':
        case 'Right Side':
          this.offenderPhotos['bodyRight'] = photo.photoUrl;
          break;
        case 'Custom 1 (Scars, Marks, Tattoos)':
        case 'Mark 1':
          this.offenderPhotos['custom1'] = photo.photoUrl;
          break;
        case 'Custom 2 (Scars, Marks, Tattoos)':
        case 'Mark 2':
          this.offenderPhotos['custom2'] = photo.photoUrl;
          break;
        case 'Custom 3 (Scars, Marks, Tattoos)':
        case 'Mark 3':
          this.offenderPhotos['custom3'] = photo.photoUrl;
          break;
        case 'Custom 4 (Scars, Marks, Tattoos)':
        case 'Mark 4':
          this.offenderPhotos['custom4'] = photo.photoUrl;
          break;
        default:
          this.unassignedPhotos.push(photo);
      }
    } else if (photo.photoMain) {
      this.offenderPhotos['headFront'] = photo.photoUrl;
    } else {
      this.unassignedPhotos.push(photo);
    }
  }

  hasPhotoForType(typeId: string): boolean {
    const type = this.photoTypes.find(t => t.id === typeId);
    return this.offenderPhotos[typeId] && type && this.offenderPhotos[typeId] !== type.placeholder;
  }

  // View photo in full size
  viewPhoto(typeId: string): void {
    const photoUrl = this.offenderPhotos[typeId];
    if (photoUrl) {
      Swal.fire({
        imageUrl: photoUrl,
        imageAlt: 'Offender Photo',
        showConfirmButton: true,
        confirmButtonText: 'Close',
        width: 'auto',
        background: '#1a1f2e',
        color: '#f1f5f9'
      });
    }
  }

  // Delete photo with confirmation
  deletePhoto(typeId: string): void {
    const type = this.photoTypes.find(t => t.id === typeId);

    Swal.fire({
      title: 'Delete Photo?',
      text: `Are you sure you want to delete the ${type?.label || 'photo'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      background: '#1a1f2e',
      color: '#f1f5f9'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performPhotoDelete(typeId);
      }
    });
  }

  private performPhotoDelete(typeId: string): void {
    const type = this.photoTypes.find(t => t.id === typeId);
    if (type) {
      // Reset to placeholder
      this.offenderPhotos[typeId] = type.placeholder;

      // Update Firestore to remove the photo
      this.firestore.collection('photos', ref =>
        ref.where('offenderID', '==', this.offenderId)
      ).get().subscribe(snapshot => {
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          const photosDoc = snapshot.docs[0].data() as Photos;

          if (photosDoc.photos) {
            const updatedPhotos = photosDoc.photos.filter(p =>
              p.photoShot !== type.label &&
              p.photoShot !== this.getLegacyLabel(typeId)
            );

            this.firestore.collection('photos').doc(docId).update({
              photos: updatedPhotos
            }).then(() => {
              this.snackBar.open('Photo deleted successfully', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            });
          }
        }
      });
    }
  }

  private getLegacyLabel(typeId: string): string {
    const legacyMap: { [key: string]: string } = {
      'headFront': 'Head Front',
      'headLeft': 'Head Left',
      'headRight': 'Head Right',
      'bodyFront': 'Full Body Front',
      'bodyLeft': 'Full Body Left',
      'bodyRight': 'Full Body Right',
      'custom1': 'Custom 1 (Scars, Marks, Tattoos)',
      'custom2': 'Custom 2 (Scars, Marks, Tattoos)',
      'custom3': 'Custom 3 (Scars, Marks, Tattoos)',
      'custom4': 'Custom 4 (Scars, Marks, Tattoos)'
    };
    return legacyMap[typeId] || typeId;
  }

  openCameraDialog(photoTypeId: string): void {
    this.selectedPhotoType = photoTypeId;
    const photoType = this.photoTypes.find(t => t.id === photoTypeId);
    const photoTypeLabel = photoType?.label || '';

    const dialogRef = this.dialog.open(CameraDialogComponent, {
      width: '650px',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: 'dark-dialog',
      data: {
        photoTypeId: photoTypeId,
        photoTypeLabel: photoTypeLabel,
        offenderId: this.offenderId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && !result.error) {
        if (result.photoUrl) {
          // Start upload progress tracking
          this.uploadingPhotoType = photoTypeId;
          this.uploadProgress = 0;

          // Simulate upload progress while actual upload happens
          const progressInterval = setInterval(() => {
            if (this.uploadProgress < 90) {
              this.uploadProgress += 10;
            }
          }, 200);

          // Update local display immediately for preview
          this.offenderPhotos[photoTypeId] = result.photoUrl;

          const newPhoto: PhotoTemplate = {
            photoUrl: result.photoUrl,
            photoComment: result.photoComment || photoTypeLabel,
            photoMain: result.photoMain || photoTypeId === 'headFront',
            photoDate: result.photoDate || new Date().toISOString(),
            photoShot: result.photoShot || photoTypeLabel
          };

          // Emit for parent component to handle upload
          this.photoTaken.emit(newPhoto);

          // Complete progress after a delay
          setTimeout(() => {
            clearInterval(progressInterval);
            this.uploadProgress = 100;

            setTimeout(() => {
              this.uploadingPhotoType = null;
              this.uploadProgress = 0;

              this.snackBar.open('Photo saved successfully!', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            }, 500);
          }, 2000);
        }
      } else if (result && result.error) {
        console.error('Camera dialog error:', result.error);
        this.snackBar.open('Error capturing photo: ' + result.error, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  assignPhoto(photo: PhotoTemplate): void {
    const dialogRef = this.dialog.open(PhotoAssignmentDialogComponent, {
      width: '400px',
      maxHeight: '90vh',
      panelClass: 'dark-dialog',
      data: {
        photo: photo,
        photoTypes: this.photoTypes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const { typeId, isMain } = result;
        const selectedType = this.photoTypes.find(type => type.id === typeId);

        if (selectedType) {
          const updatedPhoto = { ...photo, photoShot: selectedType.label, photoMain: isMain };
          this.updatePhotoAssignment(photo, updatedPhoto);
          this.offenderPhotos[typeId] = photo.photoUrl;
          this.unassignedPhotos = this.unassignedPhotos.filter(p =>
            p.photoUrl !== photo.photoUrl || p.photoDate !== photo.photoDate
          );

          this.snackBar.open('Photo assigned successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        }
      }
    });
  }

  updatePhotoAssignment(oldPhoto: PhotoTemplate, updatedPhoto: PhotoTemplate): void {
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const photosDoc = snapshot.docs[0].data() as Photos;

        if (photosDoc.photos) {
          const updatedPhotos = photosDoc.photos.map(p => {
            if (p.photoUrl === oldPhoto.photoUrl && p.photoDate === oldPhoto.photoDate) {
              return updatedPhoto;
            }
            return p;
          });

          this.firestore.collection('photos').doc(docId).update({
            photos: updatedPhotos
          }).then(() => {
            if (updatedPhoto.photoShot === 'Front (Main)' && updatedPhoto.photoMain && updatedPhoto.photoUrl) {
              this.updateOffenderMainPhoto(updatedPhoto.photoUrl);
            }
          }).catch(error => {
            console.error('Error updating photo assignment:', error);
          });
        }
      }
    });
  }

  private updateOffenderMainPhoto(photoUrl: string): void {
    this.firestore.collection('users').doc(this.offenderId).update({
      mainPhoto: photoUrl
    }).then(() => {
      console.log('Offender main photo updated successfully');
    }).catch(error => {
      console.error('Error updating offender main photo:', error);
    });
  }

  // Legacy method for backward compatibility
  updatePhotoShot(photo: PhotoTemplate, photoShot: string): void {
    this.firestore.collection('photos', ref =>
      ref.where('offenderID', '==', this.offenderId)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const photosDoc = snapshot.docs[0].data() as Photos;

        if (photosDoc.photos) {
          const updatedPhotos = photosDoc.photos.map(p => {
            if (p.photoUrl === photo.photoUrl && p.photoDate === photo.photoDate) {
              return { ...p, photoShot };
            }
            return p;
          });

          this.firestore.collection('photos').doc(docId).update({
            photos: updatedPhotos
          }).catch(error => {
            console.error('Error updating photo shot type:', error);
          });
        }
      }
    });
  }
}
