import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {HttpClient} from "@angular/common/http";
import {Phonecheckin} from "../../../models/phonecheckin";
import {doc} from "@angular/fire/firestore";
import {NgForOf, NgIf} from "@angular/common";
import swal from "sweetalert2";
import {SafePipe} from "../../../pipes/safe.pipe";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-phonechekinreport',
  standalone: true,
  imports: [
    NgForOf,
    SafePipe,
    NgIf
  ],
  templateUrl: './phonechekinreport.component.html',
  styleUrl: './phonechekinreport.component.scss'
})
export class PhonechekinreportComponent implements OnInit, OnDestroy {

  phoneCheckins: Phonecheckin[] = [];
  subscription: any[] = [];
  constructor(private httpClient: HttpClient, private fs: AngularFirestore, sanatize: DomSanitizer) {
    // Get all of the phonecheckins from the database and put them into the phoneCheckins array
    this.subscription.push(this.fs.collection('phonecheckins').get().subscribe((data) => {
      this.phoneCheckins = [];
      data.docs.forEach((doc) => {
        this.phoneCheckins.push(doc.data() as Phonecheckin);
      });
      // Sort the phoneCheckins array by timestamp showing the newest first
        this.phoneCheckins.sort((a, b) => {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        })
    })
    )
  }

  doMap(c: Phonecheckin) {
    // Open a swal alert with and iframe to google maps showing the location of the checkin with lat and lng
    swal.fire({
      title: 'Check In Location',
      width: 650,
      heightAuto: true,
      html: '<div class="text-center"><h3>CHECKED IN HERE ON '+c.datetime+'</h3></div><br><iframe width="600" height="400" src="https://maps.google.com/maps?q='+c.lat+','+c.lon+'&hl=en&z=18&amp;output=embed"></iframe>',
      showCancelButton: false,
      showConfirmButton: true,
      confirmButtonText: 'Close',
    })
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscription.forEach((sub) => {
      sub.unsubscribe();
    })
  }

  protected readonly parseInt = parseInt;
}
