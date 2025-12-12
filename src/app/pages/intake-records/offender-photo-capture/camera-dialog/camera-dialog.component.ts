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

  // New features
  isHeadShot: boolean = true;
  hasMultipleCameras: boolean = false;
  private facingMode: string = 'user';

  // Countdown
  showCountdown: boolean = false;
  countdownValue: number = 3;

  // Upload progress
  isUploading: boolean = false;
  uploadProgress: number = 0;

  constructor(
    public dialogRef: MatDialogRef<CameraDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CameraDialogData
  ) { }

  ngOnInit(): void {
    // Determine if this is a head shot for positioning guide
    this.isHeadShot = this.data.photoTypeId.startsWith('head');

    // Check for multiple cameras
    this.checkForMultipleCameras();

    // Start the camera
    setTimeout(() => {
      this.startCamera();
    }, 300);

    // Auto-set main photo for head front
    if (this.data.photoTypeId === 'headFront') {
      this.isMainPhoto = true;
    }

    // Auto-fill comment based on photo type
    this.photoComment = this.data.photoTypeLabel;
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async checkForMultipleCameras(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.hasMultipleCameras = videoDevices.length > 1;
    } catch (error) {
      console.error('Error checking cameras:', error);
      this.hasMultipleCameras = false;
    }
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      });

      // Wait for ViewChild to be available
      await this.waitForVideoElement();

      if (this.dialogCameraFeed && this.dialogCameraFeed.nativeElement) {
        const video = this.dialogCameraFeed.nativeElement;
        video.srcObject = this.stream;

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.dialogRef.close({ error: 'Unable to access the camera. Please check your permissions.' });
    }
  }

  private waitForVideoElement(): Promise<void> {
    return new Promise((resolve) => {
      const checkElement = () => {
        if (this.dialogCameraFeed && this.dialogCameraFeed.nativeElement) {
          resolve();
        } else {
          setTimeout(checkElement, 50);
        }
      };
      checkElement();
    });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async flipCamera(): Promise<void> {
    this.stopCamera();
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startCamera();
  }

  startCountdown(): void {
    this.showCountdown = true;
    this.countdownValue = 3;

    const interval = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue === 0) {
        clearInterval(interval);
        setTimeout(() => {
          this.showCountdown = false;
          this.takeSnapshot();
        }, 500);
      }
    }, 1000);
  }

  takeSnapshot(): void {
    if (!this.stream || !this.dialogCameraFeed || !this.dialogSnapshotCanvas) return;

    const canvas = this.dialogSnapshotCanvas.nativeElement;
    const video = this.dialogCameraFeed.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // If using front camera, mirror the image
    if (this.facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    this.snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.isCameraActive = false;
    this.stopCamera();
  }

  retakePhoto(): void {
    this.snapshotDataUrl = null;
    this.isCameraActive = true;
    this.startCamera();
  }

  savePhoto(): void {
    if (!this.snapshotDataUrl) {
      return;
    }

    if (!this.photoComment) {
      return;
    }

    // Show upload progress simulation
    this.isUploading = true;
    this.uploadProgress = 0;

    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += Math.random() * 15;
        if (this.uploadProgress > 90) this.uploadProgress = 90;
      }
    }, 200);

    // Simulate brief processing time then close
    setTimeout(() => {
      clearInterval(progressInterval);
      this.uploadProgress = 100;

      setTimeout(() => {
        this.dialogRef.close({
          photoUrl: this.snapshotDataUrl,
          photoComment: this.photoComment,
          photoMain: this.isMainPhoto,
          photoDate: new Date().toISOString(),
          photoTypeId: this.data.photoTypeId,
          photoShot: this.data.photoTypeLabel
        });
      }, 300);
    }, 1500);
  }

  cancel(): void {
    this.stopCamera();
    this.dialogRef.close();
  }
}
