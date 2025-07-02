import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {take} from "rxjs/operators";
import {NgFor, NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-magistrate-suretor',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './magistrate-suretor.component.html',
  styleUrl: './magistrate-suretor.component.scss'
})
export class MagistrateSuretorComponent implements OnInit{

  @Output() onExit: EventEmitter<boolean> = new EventEmitter<boolean>();

  suretorsRecords: any[] = [];
  suretors: any[] = [];

  searchTerm: string = '';

  constructor(private af: AngularFirestore) {

  }

  ngOnInit(): void {
    this.suretors = [];
    this.suretorsRecords = [];

    this.af.collection('magistrateBookings').valueChanges().pipe(take(1)).subscribe((data: any) => {
      const tempSuretors: any[] = [];

      data.forEach((suretor: any) => {
        tempSuretors.push({
          id: suretor.id,
          suretorName: suretor.suretorName,
          suretorNIB: suretor.suretorNIB,
          suretorDOB: suretor.suretorDOB,
          suretorStatus: suretor.suretorStatus,
          suretorAssignDate: suretor.suretorAssignDate,
          lastName: suretor.lastName,
          firstName: suretor.firstName,
          middleName: suretor.middleName
        });

        tempSuretors.push({
          id: suretor.id,
          suretorName: suretor.suretorName2,
          suretorNIB: suretor.suretorNIB2,
          suretorDOB: suretor.suretorDOB2,
          suretorStatus: suretor.suretorStatus,
          suretorAssignDate: suretor.suretorAssignDate2,
          lastName: suretor.lastName,
          firstName: suretor.firstName,
          middleName: suretor.middleName
        });
      });

      // Clean up empty names/NIBs
      this.suretorsRecords = tempSuretors.filter(s => s.suretorName && s.suretorNIB);
      this.suretorsRecords.sort((a, b) => a.suretorName.localeCompare(b.suretorName));

      // Copy to visible list
      this.suretors = [...this.suretorsRecords];
    });
  }

  onSearchChange() {
    const term = this.searchTerm.toLowerCase();
    this.suretors = this.suretorsRecords.filter(s => s.suretorName.toLowerCase().includes(term));
  }

  clearSearch() {
    this.searchTerm = '';
    this.suretors = [...this.suretorsRecords];
  }


  checkDuplicate(suretorName: any) {
    // Check the suretor array is the name is found 2 or more times and if true return name in all uppercase
    if (this.suretors.filter((s) => s.suretorName === suretorName).length > 1) {
      return true;
    } else {
      return false;
    }

  }

  doExit() {
    this.onExit.emit(true);
  }
}
