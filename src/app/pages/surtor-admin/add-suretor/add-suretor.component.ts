import { Component, OnInit, Inject, Optional, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Suretor, Surety, SuretyApplication } from '../../../models/suretor';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-add-suretor',
  templateUrl: './add-suretor.component.html',
  styleUrls: ['./add-suretor.component.scss']
})
export class AddSuretorComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;

  suretorForm: FormGroup;
  isEditMode = false;
  title = 'Add New Suretor';
  submitButtonText = 'Create Suretor';

  constructor(
    private fb: FormBuilder,
    private afs: AngularFirestore,
    public dialogRef: MatDialogRef<AddSuretorComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Initialize the form
    this.suretorForm = this.createForm();

    // Check if we're in edit mode
    if (data && data.suretor) {
      this.isEditMode = true;
      this.title = 'Edit Suretor';
      this.submitButtonText = 'Update Suretor';
      this.populateForm(data.suretor);
    }
  }

  ngOnInit(): void {
    // Any additional initialization
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Personal Information
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      nib: ['', Validators.required],
      dob: [null],
      address: ['', Validators.required],
      poBox: [''],
      phone: ['', Validators.required],
      phone2: [''],
      email: ['', [Validators.email]],
      spn: [''],

      // Employment Information
      empName: [''],
      empAddress: [''],
      empPhone: [''],

      // Property Information
      immovablePropertyParticulars: [''],
      immovablePropertyValue: [0],

      // Bank Account Information
      bankName: [''],
      accountType: [''],
      accountBalance: [0],

      // Moveable Assets
      moveableAssetDescription: [''],
      moveableAssetValue: [0],

      // Case Details
      defendantName: [''],
      defendantAddress: [''],
      bondAmount: [0],
      court: ['Supreme Court'],

      // Declarations
      encumbranceStatus: ['Unknown'],
      mortgageHolder: [''],
      priorSuretyCases: [''],
      hasPendingCriminalCharges: [false],
      isCurrentlySurety: [false],

      // Metadata
      status: ['Active']
    });
  }

  populateForm(suretor: any): void {
    if (suretor.surety) {
      // New format
      const surety = suretor.surety;
      const caseDetails = suretor.caseDetails || {};
      const declarations = suretor.declarations || {};
      const metadata = suretor.metadata || {};

      this.suretorForm.patchValue({
        firstName: surety.firstName,
        middleName: surety.middleName,
        lastName: surety.lastName,
        nib: surety.nib,
        dob: surety.dob ? surety.dob.toDate() : null,
        address: surety.address,
        poBox: surety.poBox,
        phone: surety.phone,
        phone2: surety.phone2 || '',
        email: surety.email,
        spn: surety.spn,

        empName: surety.empName,
        empAddress: surety.empAddress,
        empPhone: surety.empPhone,

        immovablePropertyParticulars: surety.immovableProperty?.particulars || '',
        immovablePropertyValue: surety.immovableProperty?.estimatedValue || 0,

        bankName: surety.bankAccount?.bankName || '',
        accountType: surety.bankAccount?.accountType || '',
        accountBalance: surety.bankAccount?.accountBalance || 0,

        // Just take the first moveable asset if any
        moveableAssetDescription: surety.otherMoveableProperty && surety.otherMoveableProperty.length > 0
          ? surety.otherMoveableProperty[0].description : '',
        moveableAssetValue: surety.otherMoveableProperty && surety.otherMoveableProperty.length > 0
          ? surety.otherMoveableProperty[0].estimatedValue : 0,

        defendantName: caseDetails.defendantName,
        defendantAddress: caseDetails.defendantAddress,
        bondAmount: caseDetails.bondAmount,
        court: caseDetails.court,

        encumbranceStatus: declarations.encumbranceStatus,
        mortgageHolder: declarations.mortgageHolder,
        priorSuretyCases: declarations.priorSuretyCases,
        hasPendingCriminalCharges: declarations.hasPendingCriminalCharges,
        isCurrentlySurety: declarations.isCurrentlySurety,

        status: metadata.status
      });
    }
  }

  onSubmit(): void {
    if (this.suretorForm.invalid) {
      return;
    }

    const formValue = this.suretorForm.value;

    // Create the SuretyApplication object
    const suretorData: SuretyApplication = {
      applicationId: this.isEditMode && this.data.suretor.id ? this.data.suretor.id : this.afs.createId(),
      surety: {
        fullName: `${formValue.firstName} ${formValue.middleName} ${formValue.lastName}`.trim(),
        firstName: formValue.firstName,
        middleName: formValue.middleName,
        lastName: formValue.lastName,
        address: formValue.address,
        nib: formValue.nib,
        dob: formValue.dob ? Timestamp.fromDate(new Date(formValue.dob)) : null,
        email: formValue.email,
        phone: formValue.phone,
        phone2: formValue.phone2,
        poBox: formValue.poBox,
        spn: formValue.spn,
        empName: formValue.empName,
        empAddress: formValue.empAddress,
        empPhone: formValue.empPhone,
        immovableProperty: {
          particulars: formValue.immovablePropertyParticulars,
          estimatedValue: formValue.immovablePropertyValue
        },
        bankAccount: {
          bankName: formValue.bankName,
          accountType: formValue.accountType,
          accountBalance: formValue.accountBalance
        },
        otherMoveableProperty: formValue.moveableAssetDescription ? [
          {
            description: formValue.moveableAssetDescription,
            estimatedValue: formValue.moveableAssetValue
          }
        ] : []
      },
      caseDetails: {
        defendantName: formValue.defendantName,
        defendantAddress: formValue.defendantAddress,
        bondAmount: formValue.bondAmount,
        court: formValue.court
      },
      declarations: {
        encumbranceStatus: formValue.encumbranceStatus,
        mortgageHolder: formValue.mortgageHolder,
        priorSuretyCases: formValue.priorSuretyCases,
        hasPendingCriminalCharges: formValue.hasPendingCriminalCharges,
        isCurrentlySurety: formValue.isCurrentlySurety
      },
      execution: {
        suretySignatureUrl: '',
        dateSigned: Timestamp.now(),
        attestingOfficialName: ''
      },
      metadata: {
        status: formValue.status,
        scannedAt: Timestamp.now(),
        scannedByUserId: '',
        reviewedAt: null,
        reviewedByUserId: null,
        originalImageUrls: []
      },
      aiComments: {},
      approval: 'Pending'
    };

    // Close the dialog and return the data
    this.dialogRef.close({
      suretor: suretorData,
      action: this.isEditMode ? 'update' : 'create'
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Opens the file dialog when the Import Scanned Application button is clicked
   */
  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handles the file selection event
   * @param event The file selection event
   */
  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      console.log('Selected file:', file.name);

      // For now, we're just logging the file selection
      // The actual file processing will be implemented later

      // Reset the file input so the same file can be selected again if needed
      fileInput.value = '';
    }
  }
}
