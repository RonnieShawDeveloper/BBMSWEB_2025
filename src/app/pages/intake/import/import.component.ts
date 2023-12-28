import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Afis} from "../../../models/afis";
import {Defendants} from "../../../models/defendants";
import {Offender} from "../../../models/offender";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import Swal from "sweetalert2";

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent {

  @Input() selectedAfis: Afis = {} as Afis;
  @Output() complete: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(private fs: AngularFirestore) {
  }

  doCancel() {
    this.complete.emit(true);
  }

  doImport() {
    // Capitalize the first letter of the first, middle and last name AND Lowercase the rest of the letters in the first, middle and last name
    this.selectedAfis.fName = this.selectedAfis.fName.charAt(0).toUpperCase() + this.selectedAfis.fName.slice(1).toLowerCase();
    this.selectedAfis.mName = this.selectedAfis.mName.charAt(0).toUpperCase() + this.selectedAfis.mName.slice(1).toLowerCase();
    this.selectedAfis.lName = this.selectedAfis.lName.charAt(0).toUpperCase() + this.selectedAfis.lName.slice(1).toLowerCase();

    // Remove the whitespace from the beginning and end of the first, middle and last name
    this.selectedAfis.fName = this.selectedAfis.fName.trim();
    this.selectedAfis.mName = this.selectedAfis.mName.trim();
    this.selectedAfis.lName = this.selectedAfis.lName.trim();

    // Remove any characters that are not letters from the first, middle and last name
    this.selectedAfis.fName = this.selectedAfis.fName.replace(/[^a-zA-Z]/g, '');
    this.selectedAfis.mName = this.selectedAfis.mName.replace(/[^a-zA-Z]/g, '');
    this.selectedAfis.lName = this.selectedAfis.lName.replace(/[^a-zA-Z]/g, '');

    const newRecord: Offender = {
      id: this.fs.createId(),
      fName: this.selectedAfis.fName,
      lName: this.selectedAfis.lName,
      mName: this.selectedAfis.mName,
      addLine1: this.selectedAfis.address1,
      addLine2: this.selectedAfis.address2,
      city: this.selectedAfis.locality,
      state: this.selectedAfis.island,
      zip: this.selectedAfis.country,
      dob: this.selectedAfis.dob,
      height: this.selectedAfis.height,
      weight: this.selectedAfis.weight,
      eyeColor: this.selectedAfis.eyes,
      hairColor: this.selectedAfis.hair,
      alias: this.selectedAfis.alias,
      spn: this.selectedAfis.id,
      pob: this.selectedAfis.pob,
      gender: this.selectedAfis.sex,
      race: this.selectedAfis.race,
    }
    console.log("DOB Before Formatting: ", newRecord.dob);

    // Get the date in newRecord.dob that has a format of M/D/YYYY and convert it to YYYY-MM-DD adding the leading zeros to the month and day as needed
    const dobArray = newRecord.dob.split('/');
    const month = dobArray[0].length === 1 ? '0' + dobArray[0] : dobArray[0];
    const day = dobArray[1].length === 1 ? '0' + dobArray[1] : dobArray[1];
    newRecord.dob = dobArray[2] + '-' + month + '-' + day;
    console.log("DOB After Formatting: ", newRecord.dob);

    // Check to be sure the record doesn't already exist in the database users collection using the spn
    this.fs.collection('users', ref => ref.where('spn', '==', this.selectedAfis.id)).get().subscribe((data) => {
      if (data.size > 0) {
        Swal.fire({
          title: 'Duplicate Record',
          text: 'This record already exists in the database.',
          icon: 'warning',
          confirmButtonText: 'OK'
        }).then(() => {
          this.complete.emit(true);
        })
      } else {
        // Add the record to the database
        this.fs.collection('users').doc(newRecord.id).set(newRecord).then(() => {
          Swal.fire({
            title: 'Record Added',
            text: 'The record has been added to the database.',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.complete.emit(true);
          } )
        }).catch((error) => {
          Swal.fire({
            title: 'Error',
            text: 'There was an error adding the record to the database.',
            icon: 'error',
            confirmButtonText: 'OK'
          }).then(() => {
            this.complete.emit(true);
          })
        })
      }
    })
  }
}
