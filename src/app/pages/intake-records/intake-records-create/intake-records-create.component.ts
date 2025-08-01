import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Subscription, finalize } from 'rxjs';
import { Offender } from '../../../models/offender';
import { Afis } from '../../../models/afis';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-intake-records-create',
  templateUrl: './intake-records-create.component.html',
  styleUrls: ['./intake-records-create.component.scss']
})
export class IntakeRecordsCreateComponent implements OnInit, OnDestroy {
  @Input() afisRecord: Afis = {};
  @Input() tempAfisId: string = '';
  @Output() offenderCreated = new EventEmitter<Offender>();
  @Output() cancel = new EventEmitter<void>();

  // New offender record
  newOffender: Offender = {};

  // Photo handling
  selectedPhoto: File | null = null;
  photoURL: string = '';
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // Form state
  isSubmitting: boolean = false;
  isManualEntry: boolean = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) { }

  ngOnInit(): void {
    // Initialize the new offender record
    this.initializeOffenderRecord();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Initialize the offender record with AFIS data or empty values
  initializeOffenderRecord(): void {
    this.newOffender = {
      id: this.firestore.createId(), // Generate a new Firestore ID
      spn: this.afisRecord.id || this.tempAfisId || '', // Use AFIS ID or temp ID
      lName: this.afisRecord.lName || '',
      fName: this.afisRecord.fName || '',
      mName: this.afisRecord.mName || '',
      dob: this.afisRecord.dob || '',
      gender: this.afisRecord.sex || '',
      race: this.afisRecord.race || '',
      height: this.afisRecord.height || '',
      weight: this.afisRecord.weight || '',
      eyeColor: this.afisRecord.eyes || '',
      hairColor: this.afisRecord.hair || '',
      addLine1: this.afisRecord.address1 || '',
      addLine2: this.afisRecord.address2 || '',
      city: this.afisRecord.locality || '',
      state: this.afisRecord.island || '',
      pob: this.afisRecord.pob || '',
      complex: '',
      build: '',
      mainPhoto: '',
      jetAfis: this.tempAfisId ? 'TEMP' : 'AFIS'
    };

    // If this is a temporary AFIS ID, set isManualEntry to true
    this.isManualEntry = !!this.tempAfisId;
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

  // Upload the selected photo to Firebase Storage
  uploadPhoto(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedPhoto) {
        resolve('');
        return;
      }

      this.isUploading = true;

      // Create a reference to the storage location
      const filePath = `offender-photos/${this.newOffender.id}/${Date.now()}_${this.selectedPhoto.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, this.selectedPhoto);

      // Monitor upload progress
      this.subscriptions.push(
        task.percentageChanges().subscribe(progress => {
          this.uploadProgress = progress || 0;
        })
      );

      // Get the download URL when upload is complete
      task.snapshotChanges().pipe(
        finalize(() => {
          this.subscriptions.push(
            fileRef.getDownloadURL().subscribe(url => {
              this.isUploading = false;
              resolve(url);
            }, error => {
              this.isUploading = false;
              console.error('Error getting download URL:', error);
              reject(error);
            })
          );
        })
      ).subscribe();
    });
  }

  // Save the new offender record to Firestore
  async saveOffender(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    try {
      // Upload photo if selected
      if (this.selectedPhoto) {
        this.newOffender.mainPhoto = await this.uploadPhoto();
      }

      // Save the offender record to Firestore
      await this.firestore.collection('users').doc(this.newOffender.id).set(this.newOffender);

      // Show success message
      Swal.fire({
        title: 'Success',
        text: 'Offender record created successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      // Emit the created offender
      this.offenderCreated.emit(this.newOffender);
    } catch (error) {
      console.error('Error saving offender:', error);

      // Show error message
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while saving the offender record. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });

      this.isSubmitting = false;
    }
  }

  // Validate the form before submission
  validateForm(): boolean {
    // Required fields
    const requiredFields = ['lName', 'fName', 'dob', 'gender', 'race'];
    const missingFields = requiredFields.filter(field => !this.newOffender[field]);

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

  // Cancel the creation process
  cancelCreation(): void {
    Swal.fire({
      title: 'Cancel Creation',
      text: 'Are you sure you want to cancel? All entered information will be lost.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel',
      cancelButtonText: 'No, Continue Editing'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cancel.emit();
      }
    });
  }
}
