import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { Suretor, SuretyApplication } from '../../../models/suretor';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';

interface UnifiedSuretorRecord {
  suretorName: string;
  suretorLastName: string;
  suretorDOB: string;
  suretorNIB: string;
  defendantName: string;
  assignedDate: any; // Can be string or Timestamp
  isDuplicate: boolean;
}

@Component({
  selector: 'app-magistrate-suretor',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule],
  templateUrl: './magistrate-suretor.component.html',
  styleUrl: './magistrate-suretor.component.scss'
})
export class MagistrateSuretorComponent implements OnInit {

  @Output() onExit: EventEmitter<boolean> = new EventEmitter<boolean>();

  suretors: UnifiedSuretorRecord[] = [];
  loading = true;
  globalFilterValue: string = '';


  constructor(private af: AngularFirestore) { }

  ngOnInit(): void {
    this.loading = true;
    const magistrateBookings$ = this.af.collection('magistrateBookings').valueChanges().pipe(take(1));
    const suretors$ = this.af.collection('suretors').valueChanges().pipe(take(1));

    forkJoin([magistrateBookings$, suretors$]).subscribe({
      next: ([magistrateData, suretorsData]: [any[], any[]]) => {
        const allSuretors: UnifiedSuretorRecord[] = [];
        console.log('Surtors:',suretorsData, magistrateData);  // Debugging line to check data structure

        // Process Magistrate Bookings
        magistrateData.forEach(booking => {
          if (booking.suretorName && booking.suretorNIB) {
            allSuretors.push({
              suretorName: this.formatNameToLastFirst(booking.suretorName),
              suretorLastName: this.getLastNameFromName(booking.suretorName),
              suretorDOB: booking.suretorDOB,
              suretorNIB: booking.suretorNIB,
              defendantName: `${booking.lastName}, ${booking.firstName} ${booking.middleName || ''}`.trim(),
              assignedDate: booking.suretorAssignDate,
              isDuplicate: false
            });
          }
          if (booking.suretorName2 && booking.suretorNIB2) {
            allSuretors.push({
              suretorName: this.formatNameToLastFirst(booking.suretorName2),
              suretorLastName: this.getLastNameFromName(booking.suretorName2),
              suretorDOB: booking.suretorDOB2,
              suretorNIB: booking.suretorNIB2,
              defendantName: `${booking.lastName}, ${booking.firstName} ${booking.middleName || ''}`.trim(),
              assignedDate: booking.suretorAssignDate2,
              isDuplicate: false
            });
          }
        });

        // Process Supreme Court Suretors
        suretorsData.forEach(suretorDoc => {
          // New SuretyApplication format
          if (suretorDoc.caseDetails && suretorDoc.surety) {
            const app = suretorDoc as SuretyApplication;
            allSuretors.push({
              suretorName: `${app.surety.lastName}, ${app.surety.firstName} ${app.surety.middleName || ''}`.trim(),
              suretorLastName: app.surety.lastName,
              suretorDOB: app.surety.dob ? (app.surety.dob as any).toDate().toLocaleDateString() : '',
              suretorNIB: app.surety.nib,
              defendantName: app.caseDetails.defendantName,
              assignedDate: app.execution.dateSigned,
              isDuplicate: false
            });
          } else { // Old Suretor format
            const oldSuretor = suretorDoc as Suretor;
            if (oldSuretor.NIB) {
              allSuretors.push({
                suretorName: `${oldSuretor.lastName}, ${oldSuretor.firstName} ${oldSuretor.middleName || ''}`.trim(),
                suretorLastName: oldSuretor.lastName || '',
                suretorDOB: '', // Not available in a structured way
                suretorNIB: oldSuretor.NIB,
                defendantName: oldSuretor.offenderPledged || 'N/A',
                assignedDate: '', // Not available
                isDuplicate: false
              });
            }
          }
        });

        // Identify duplicates by NIB, but only if the defendant is different.
        const suretorsByNib = allSuretors.reduce((acc, record) => {
          if (record.suretorNIB) {
            if (!acc[record.suretorNIB]) {
              acc[record.suretorNIB] = [];
            }
            acc[record.suretorNIB].push(record);
          }
          return acc;
        }, {} as { [key: string]: UnifiedSuretorRecord[] });

        const duplicateNibSet = new Set<string>();
        for (const nib in suretorsByNib) {
          const records = suretorsByNib[nib];
          if (records.length > 1) {
            const firstDefendantName = records[0].defendantName;
            const isTrueDuplicate = records.some(record => record.defendantName !== firstDefendantName);
            if (isTrueDuplicate) {
              duplicateNibSet.add(nib);
            }
          }
        }

        allSuretors.forEach(s => {
          if (s.suretorNIB && duplicateNibSet.has(s.suretorNIB)) {
            s.isDuplicate = true;
          }
        });

        // Sort by duplicates first, then by suretor's last name
      allSuretors.sort((a, b) => {
        if (a.isDuplicate && !b.isDuplicate) {
          return -1; // a comes first
        }
        if (!a.isDuplicate && b.isDuplicate) {
          return 1; // b comes first
        }
        // If both are duplicates or not, sort by last name
        return a.suretorLastName.localeCompare(b.suretorLastName);
      });

        this.suretors = allSuretors;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching suretor data:', err);
        this.loading = false; // Ensure loading stops on error
      }
    });
  }

  formatNameToLastFirst(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(p => p);
    if (parts.length < 2) {
        return fullName;
    }
    const lastName = parts.pop() as string;
    return `${lastName}, ${parts.join(' ')}`;
  }

  getLastNameFromName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(p => p);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
  }

  doExit() {
    this.onExit.emit(true);
  }
}