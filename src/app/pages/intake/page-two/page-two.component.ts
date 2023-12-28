import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Defendants} from "../../../models/defendants";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import swal from "sweetalert2";

@Component({
  selector: 'app-page-two',
  templateUrl: './page-two.component.html',
  styleUrls: ['./page-two.component.scss']
})
export class PageTwoComponent {

  @Input () selectedDefendant: Defendants = {} as Defendants;
  @Output() complete:EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(private fs: AngularFirestore) { }

  doUpdate() {
    console.log('doUpdate()');
    // Update the defendant record in firestore using the database called user and the document called selectedDefendant.id
    this.fs.collection('users').doc(this.selectedDefendant.id).update(this.selectedDefendant);
    swal.fire({
      title: 'Defendant Updated',
      text: 'The defendant record has been updated',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      this.complete.emit(true);
    });
  }

  doCancel() {
    console.log('docCancel()');
    this.complete.emit(true);
  }
}

