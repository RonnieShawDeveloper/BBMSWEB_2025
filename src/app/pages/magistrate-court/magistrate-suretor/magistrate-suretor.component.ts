import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {take} from "rxjs/operators";
import {NgFor, NgIf} from "@angular/common";
@Component({
  selector: 'app-magistrate-suretor',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './magistrate-suretor.component.html',
  styleUrl: './magistrate-suretor.component.scss'
})
export class MagistrateSuretorComponent implements OnInit{

  @Output() onExit: EventEmitter<boolean> = new EventEmitter<boolean>();

  suretorsRecords: any[] = [];
  suretors: any[] = [];

  constructor(private af: AngularFirestore) {

  }

  ngOnInit(): void {
    this.af.collection('magistrateBookings').valueChanges().pipe(take(1)).subscribe((data: any) => {
      // loop through data and put suretorName, suretorNIB, suretorDOB, suretorStatus, suretorAssignDate, lastName, firstName and middleName into suretors array
      data.forEach((suretor: any) => {
        this.suretors.push({
          id: suretor.id,
          suretorName: suretor.suretorName,
          suretorNIB: suretor.suretorNIB,
          suretorDOB: suretor.suretorDOB,
          suretorStatus: suretor.suretorStatus,
          surtorAssignDate: suretor.surtorAssignDate,
          lastName: suretor.lastName,
          firstName: suretor.firstName,
          middleName: suretor.middleName
        });
      });
      data.forEach((suretor: any) => {
        this.suretors.push({
          id: suretor.id,
          suretorName: suretor.suretorName2,
          suretorNIB: suretor.suretorNIB2,
          suretorDOB: suretor.suretorDOB2,
          suretorStatus: suretor.suretorStatus,
          surtorAssignDate: suretor.suretorAssignDate2,
          lastName: suretor.lastName,
          firstName: suretor.firstName,
          middleName: suretor.middleName
        });
      });

      // Loop through suretors array and remove any records that the name or nib is empty or null
      this.suretors = this.suretors.filter((s) => s.suretorName && s.suretorNIB);

      // Loop through all suretors and sort by name
      this.suretors.sort((a, b) => {
        if (a.suretorName < b.suretorName) {
          return -1;
        } else if (a.suretorName > b.suretorName) {
          return 1;
        } else {
          return 0;
        }
      });
    });
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
