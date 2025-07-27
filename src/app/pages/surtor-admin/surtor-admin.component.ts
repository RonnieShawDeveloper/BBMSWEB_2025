import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Suretor, Surety, SuretyApplication, MoveableAsset, BankAccount, ImmovableProperty, CaseDetails, Declarations, Execution, Metadata } from '../../models/suretor';
import { Booking } from '../../models/booking';
import { forkJoin, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Table } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Timestamp } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { AddSuretorComponent } from './add-suretor/add-suretor.component';

type SuretorSource = 'supreme' | 'magistrate';
type SuretorStatus = 'active' | 'inactive' | 'deleted';

interface UnifiedSuretor {
  id?: string;
  name: string;
  nib: string;
  activeIn: string[];
  offenderNames: string[];
  active?: boolean;
  source?: SuretorSource;
  status?: SuretorStatus;
  bookingStatus?: string;
  dob?: string;
}

@Component({
  selector: 'app-surtor-admin',
  templateUrl: './surtor-admin.component.html',
  styleUrls: ['./surtor-admin.component.scss']
})
export class SurtorAdminComponent implements OnInit {
  suretors: UnifiedSuretor[] = [];
  loading = true;
  totalSuretors = 0;
  activeSuretors = 0;
  inactiveSuretors = 0;

  constructor(
    private afs: AngularFirestore,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadSuretors();
  }

  loadSuretors(): void {
    this.loading = true;

    // Get data from all three collections
    const suretors$ = this.afs.collection('suretors').valueChanges({ idField: 'id' }).pipe(take(1));
    const hearings$ = this.afs.collection('hearings').valueChanges().pipe(take(1));
    const magistrateBookings$ = this.afs.collection('magistrateBookings').valueChanges({ idField: 'id' }).pipe(take(1));

    forkJoin([suretors$, hearings$, magistrateBookings$]).subscribe({
      next: ([suretorsData, hearingsData, magistrateBookingsData]) => {
        // Process suretors from the suretors collection (Supreme Court)
        const supremeSuretors: UnifiedSuretor[] = this.processSuretors(suretorsData);

        // Process suretors from the magistrateBookings collection
        const magistrateSuretors: UnifiedSuretor[] = this.processMagistrateSuretors(magistrateBookingsData);

        // Combine both lists
        const allSuretors = [...supremeSuretors, ...magistrateSuretors];

        // Check for active suretors in Supreme Court
        this.checkSupremeCourtActivity(allSuretors, hearingsData);

        // Check for active suretors in Magistrate Court
        this.checkMagistrateCourtActivity(allSuretors, magistrateBookingsData);

        // Update statistics
        this.updateStatistics(allSuretors);

        // Assign to component property
        this.suretors = allSuretors;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading suretors:', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load suretors: ' + err.message
        });
      }
    });
  }

  processMagistrateSuretors(bookingsData: any[]): UnifiedSuretor[] {
    const magistrateSuretors: UnifiedSuretor[] = [];

    bookingsData.forEach(booking => {
      // Process primary suretor if exists
      if (booking.suretorName && booking.suretorNIB) {
        const status = this.getStatusFromBookingStatus(booking.bookingStatus);

        magistrateSuretors.push({
          id: `magistrate-${booking.id}-1`,
          name: this.formatName(booking.suretorName),
          nib: booking.suretorNIB,
          dob: booking.suretorDOB,
          activeIn: [],
          offenderNames: [],
          active: status === 'active',
          source: 'magistrate',
          status: status,
          bookingStatus: booking.bookingStatus
        });
      }

      // Process secondary suretor if exists
      if (booking.suretorName2 && booking.suretorNIB2) {
        const status = this.getStatusFromBookingStatus(booking.bookingStatus);

        magistrateSuretors.push({
          id: `magistrate-${booking.id}-2`,
          name: this.formatName(booking.suretorName2),
          nib: booking.suretorNIB2,
          dob: booking.suretorDOB2,
          activeIn: [],
          offenderNames: [],
          active: status === 'active',
          source: 'magistrate',
          status: status,
          bookingStatus: booking.bookingStatus
        });
      }
    });

    return magistrateSuretors;
  }

  formatName(fullName: string): string {
    if (!fullName) return 'Unknown';

    // Split the name into parts
    const parts = fullName.trim().split(' ');

    // If only one part, return it
    if (parts.length === 1) return parts[0];

    // Assume the last part is the last name
    const lastName = parts.pop();

    // Join the remaining parts as the first name
    const firstName = parts.join(' ');

    // Return in "LastName, FirstName" format
    return `${lastName}, ${firstName}`;
  }

  getStatusFromBookingStatus(bookingStatus: string): SuretorStatus {
    if (!bookingStatus) return 'inactive';

    switch (bookingStatus.toLowerCase()) {
      case 'open':
        return 'active';
      case 'deleted':
        return 'deleted';
      case 'closed':
      default:
        return 'inactive';
    }
  }

  processSuretors(suretorsData: any[]): UnifiedSuretor[] {
    return suretorsData.map(suretor => {
      try {
        // All suretors should be in the new format (has surety property)
        if (!suretor.surety) {
          console.warn('Suretor record missing surety property:', suretor.id);
          return {
            id: suretor.id,
            name: 'Unknown Suretor',
            nib: 'Unknown',
            activeIn: [],
            offenderNames: [],
            active: false,
            source: 'supreme',
            status: 'inactive'
          };
        }

        // Determine status based on metadata.status
        let status: SuretorStatus = 'inactive';
        if (suretor.metadata?.status === 'Active') {
          status = 'active';
        } else if (suretor.metadata?.status === 'Deleted') {
          status = 'deleted';
        }

        return {
          id: suretor.id,
          name: `${suretor.surety.lastName}, ${suretor.surety.firstName} ${suretor.surety.middleName || ''}`.trim(),
          nib: suretor.surety.nib,
          activeIn: [],
          offenderNames: [],
          active: status === 'active',
          source: 'supreme',
          status: status,
          dob: suretor.surety.dob ? this.formatTimestamp(suretor.surety.dob) : undefined
        };
      } catch (error) {
        console.error('Error processing suretor:', error, suretor);
        return {
          id: suretor.id || 'unknown',
          name: 'Error Processing Suretor',
          nib: 'Unknown',
          activeIn: [],
          offenderNames: [],
          active: false,
          source: 'supreme',
          status: 'inactive'
        };
      }
    });
  }

  checkSupremeCourtActivity(suretors: UnifiedSuretor[], hearingsData: any[]): void {
    suretors.forEach(suretor => {
      const activeHearings = hearingsData.filter(hearing =>
        (hearing.suretorNIB === suretor.nib || hearing.suretor2NIB === suretor.nib) &&
        !hearing.terminationDate
      );

      if (activeHearings.length > 0) {
        suretor.activeIn.push('SUPREME COURT');
        suretor.offenderNames = suretor.offenderNames.concat(
          activeHearings.map(h => h.offenderName).filter(name => name)
        );
      }
    });
  }

  checkMagistrateCourtActivity(suretors: UnifiedSuretor[], bookingsData: any[]): void {
    suretors.forEach(suretor => {
      // Skip suretors that already have 'MAGISTRATE' in their activeIn array
      // This is to avoid duplicate entries for suretors that were added from the magistrateBookings collection
      if (suretor.source === 'magistrate') {
        // For magistrate suretors, add the offender name if not already added
        if (suretor.offenderNames.length === 0) {
          // Find the booking that contains this suretor
          const booking = bookingsData.find(b =>
            (b.suretorNIB === suretor.nib && b.suretorName) ||
            (b.suretorNIB2 === suretor.nib && b.suretorName2)
          );

          if (booking) {
            const offenderName = `${booking.firstName || ''} ${booking.middleName || ''} ${booking.lastName || ''}`.trim();
            if (offenderName) {
              suretor.offenderNames.push(offenderName);
            }

            // Add to activeIn if not already there and status is active
            if (!suretor.activeIn.includes('MAGISTRATE') && suretor.status === 'active') {
              suretor.activeIn.push('MAGISTRATE');
            }
          }
        }
        return;
      }

      // For supreme court suretors, check if they're active in magistrate court
      const relevantBookings = bookingsData.filter(booking =>
        (booking.suretorNIB === suretor.nib || booking.suretorNIB2 === suretor.nib)
      );

      // Filter for active bookings
      const activeBookings = relevantBookings.filter(booking =>
        booking.bookingStatus === 'Open'
      );

      if (activeBookings.length > 0) {
        suretor.activeIn.push('MAGISTRATE');
        suretor.offenderNames = suretor.offenderNames.concat(
          activeBookings.map(b => `${b.firstName || ''} ${b.middleName || ''} ${b.lastName || ''}`.trim())
            .filter(name => name)
        );
      }
    });
  }

  deletedSuretors = 0;

  updateStatistics(suretors: UnifiedSuretor[]): void {
    this.totalSuretors = suretors.length;
    this.activeSuretors = suretors.filter(s => s.active).length;
    this.deletedSuretors = suretors.filter(s => s.status === 'deleted').length;
    this.inactiveSuretors = this.totalSuretors - this.activeSuretors - this.deletedSuretors;
  }

  clear(table: Table): void {
    table.clear();
  }

  filterSuretors(filterType: string): void {
    if (filterType === 'all') {
      this.loadSuretors();
    } else if (filterType === 'active') {
      this.suretors = this.suretors.filter(s => s.active);
    } else if (filterType === 'inactive') {
      this.suretors = this.suretors.filter(s => !s.active);
    } else if (filterType === 'deleted') {
      this.suretors = this.suretors.filter(s => s.status === 'deleted');
    } else if (filterType === 'magistrate') {
      this.suretors = this.suretors.filter(s => s.source === 'magistrate');
    }
  }

  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      // Check if it's a Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString();
      }

      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }

      // If it's a string, return as is
      if (typeof timestamp === 'string') {
        return timestamp;
      }

      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }

  // Method to open dialog for adding a new suretor
  openAddSuretorDialog(): void {
    const dialogRef = this.dialog.open(AddSuretorComponent, {
      width: '80%',
      maxWidth: '1200px',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.suretor) {
        this.saveSuretor(result.suretor);
      }
    });
  }

  // Method to open dialog for editing an existing suretor
  openEditSuretorDialog(suretor: UnifiedSuretor): void {
    // Only supreme court suretors can be edited directly
    if (suretor.source !== 'supreme') {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Magistrate Court suretors must be edited through the Magistrate Court module.'
      });
      return;
    }

    // Get the full suretor data from Firestore
    this.afs.doc(`suretors/${suretor.id}`).valueChanges().pipe(take(1)).subscribe({
      next: (fullSuretor: any) => {
        const dialogRef = this.dialog.open(AddSuretorComponent, {
          width: '80%',
          maxWidth: '1200px',
          disableClose: true,
          data: { suretor: fullSuretor }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.suretor) {
            this.updateSuretor(result.suretor);
          }
        });
      },
      error: (err) => {
        console.error('Error loading suretor for editing:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load suretor for editing: ' + err.message
        });
      }
    });
  }

  // Method to delete a suretor
  deleteSuretor(suretor: UnifiedSuretor): void {
    // Only supreme court suretors can be deleted directly
    if (suretor.source !== 'supreme') {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Magistrate Court suretors must be managed through the Magistrate Court module.'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${suretor.name}? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Check if the suretor is active in any court
        if (suretor.activeIn && suretor.activeIn.length > 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Cannot delete ${suretor.name} because they are active in ${suretor.activeIn.join(', ')}.`
          });
          return;
        }

        // Delete the suretor from Firestore
        this.afs.doc(`suretors/${suretor.id}`).delete().then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Successfully deleted ${suretor.name}.`
          });
          this.loadSuretors(); // Reload the data
        }).catch(err => {
          console.error('Error deleting suretor:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete suretor: ' + err.message
          });
        });
      }
    });
  }

  // Method to save a new suretor to Firestore
  private saveSuretor(suretor: SuretyApplication): void {
    // Use the NIB as the document ID
    const docId = suretor.surety.nib;

    this.afs.doc(`suretors/${docId}`).set(suretor).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Successfully added ${suretor.surety.firstName} ${suretor.surety.lastName}.`
      });
      this.loadSuretors(); // Reload the data
    }).catch(err => {
      console.error('Error adding suretor:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add suretor: ' + err.message
      });
    });
  }

  // Method to update an existing suretor in Firestore
  private updateSuretor(suretor: SuretyApplication): void {
    const docId = suretor.applicationId || suretor.surety.nib;

    this.afs.doc(`suretors/${docId}`).update(suretor).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Successfully updated ${suretor.surety.firstName} ${suretor.surety.lastName}.`
      });
      this.loadSuretors(); // Reload the data
    }).catch(err => {
      console.error('Error updating suretor:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update suretor: ' + err.message
      });
    });
  }
}
