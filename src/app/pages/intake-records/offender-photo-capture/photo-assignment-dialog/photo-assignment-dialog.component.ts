import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { PhotoTemplate } from '../../../../models/photos';

export interface PhotoAssignmentDialogData {
  photo: PhotoTemplate;
  photoTypes: Array<{ id: string, label: string, placeholder: string }>;
}

export interface PhotoAssignmentDialogResult {
  typeId: string;
  isMain: boolean;
}

@Component({
  selector: 'app-photo-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  templateUrl: './photo-assignment-dialog.component.html',
  styleUrls: ['./photo-assignment-dialog.component.scss']
})
export class PhotoAssignmentDialogComponent {
  selectedTypeId: string = '';
  isMainPhoto: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<PhotoAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotoAssignmentDialogData
  ) {
    // Set default selected type to the first one in the list
    if (this.data.photoTypes && this.data.photoTypes.length > 0) {
      this.selectedTypeId = this.data.photoTypes[0].id;
    }
  }

  onAssign(): void {
    if (!this.selectedTypeId) {
      return;
    }

    this.dialogRef.close({
      typeId: this.selectedTypeId,
      isMain: this.isMainPhoto
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
