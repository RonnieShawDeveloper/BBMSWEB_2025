import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Phonecheckin } from '../../../../models/phonecheckin';
import { SafePipe } from '../../../../pipes/safe.pipe';

@Component({
  selector: 'app-map-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    SafePipe
  ],
  templateUrl: './map-dialog.component.html',
  styleUrl: './map-dialog.component.scss'
})
export class MapDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<MapDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { checkin: Phonecheckin }
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  openInGoogleMaps(): void {
    const { lat, lon } = this.data.checkin;
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, '_blank');
  }

  getFormattedTimestamp(): string {
    if (this.data.checkin.timestamp) {
      const date = new Date(parseInt(this.data.checkin.timestamp));
      return date.toLocaleString();
    }
    return this.data.checkin.datetime || 'Unknown';
  }
}
