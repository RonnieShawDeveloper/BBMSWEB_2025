import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface CameraDialogData {
  photoTypeId: string;
  photoTypeLabel: string;
  offenderId: string;
}

@Component({
  selector: 'app-camera-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ],
  templateUrl: './camera-dialog.component.html',
  styleUrls: ['./camera-dialog.component.scss']
})
export class CameraDialogComponent implements OnInit, OnDestroy {
  @ViewChild('dialogCameraFeed') dialogCameraFeed: ElementRef;
  @ViewChild('dialogSnapshotCanvas') dialogSnapshotCanvas: ElementRef;

  photoComment: string = '';
  isMainPhoto: boolean = false;
  snapshotDataUrl: string | null = null;
  private stream: MediaStream | null = null;
  isCameraActive: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<CameraDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CameraDialogData
  ) {}

  ngOnInit(): void {
    // Start the camera when the dialog opens
    setTimeout(() => {
      this.startCamera();
    }, 300);

    // Automatically set isMainPhoto to true if this is a Head Front photo
    if (this.data.photoTypeLabel === 'Head Front') {
      this.isMainPhoto = true;
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  startCamera(): void {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    }).then(stream => {
      this.stream = stream;
      if (this.dialogCameraFeed && this.dialogCameraFeed.nativeElement) {
        this.dialogCameraFeed.nativeElement.srcObject = stream;
      }
    }).catch(error => {
      console.error('Error accessing camera:', error);
      this.dialogRef.close({ error: 'Unable to access the camera. Please check your permissions.' });
    });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  takeSnapshot(): void {
    if (!this.stream || !this.dialogCameraFeed || !this.dialogSnapshotCanvas) return;

    const canvas = this.dialogSnapshotCanvas.nativeElement;
    const video = this.dialogCameraFeed.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    this.snapshotDataUrl = canvas.toDataURL('image/jpeg');
    this.isCameraActive = false;
  }

  retakePhoto(): void {
    this.snapshotDataUrl = null;
    this.isCameraActive = true;
  }

  savePhoto(): void {
    if (!this.snapshotDataUrl) {
      return;
    }

    if (!this.photoComment) {
      return;
    }

    this.dialogRef.close({
      photoUrl: this.snapshotDataUrl,
      photoComment: this.photoComment,
      photoMain: this.isMainPhoto,
      photoDate: new Date().toISOString(),
      photoTypeId: this.data.photoTypeId,
      photoShot: this.data.photoTypeLabel
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
