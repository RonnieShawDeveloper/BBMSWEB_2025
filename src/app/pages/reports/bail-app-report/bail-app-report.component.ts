import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Hearings} from "../../../models/hearings";

@Component({
  selector: 'app-bail-app-report',
  templateUrl: './bail-app-report.component.html',
  styleUrls: ['./bail-app-report.component.scss']
})
export class BailAppReportComponent implements OnInit{

  hearings: Hearings[] = [];
  reportDate = new Date().toLocaleDateString();

  constructor(private router: Router, private af: AngularFirestore) { }

  ngOnInit() {
    // Get all the active hearings
    this.af.collection<Hearings>('hearings', ref => ref.where('active', '==', true)).valueChanges().subscribe(hearings => {
      // Reverse the Offender Name from First Last to Last, First
      hearings.forEach(hearing => {
        // Split the Offender Name on the ' ' and reverse the order and separate with a ', '
        const on:String[] = hearing.offenderName.split(" ");
        const offenderName = on[1] + ", " + on[0];
        hearing.offenderName = offenderName;
      });
      // Get the events for each hearing from the collecting called 'BookingEvents' using the 'eventID' field in the hearing collection
      // and add the link and unixDate to the hearing object
      hearings.forEach(hearing => {
        this.af.collection('BookingEvents', ref => ref.where('id', '==', hearing.eventID)).valueChanges().subscribe(bailApp => {
          hearing.unixDate = bailApp[0]['unixDate'];
        });
      });
      this.hearings = hearings.sort((a, b) => (a.offenderName > b.offenderName) ? 1 : -1);
    });

  }

  // Convert Unix Date to long date format and return the data as a string
  convertUnixDate(unixDate: string) {
    // Check if unixDate is empty or null and return 'No Date Set' if it is
    if (unixDate == null || unixDate == undefined || unixDate == "") {
      return "DATE NOT SET";
    }
    // Check if the unixdate is in seconds or milliseconds and convert to milliseconds if it is in seconds
    if (unixDate.length == 10) {
      unixDate = unixDate + "000";
    }
    const date = new Date(parseInt(unixDate));
    return date.toLocaleDateString();
  }





  doExit() {
    this.router.navigate(['/criminalregistry']);
  }
}
