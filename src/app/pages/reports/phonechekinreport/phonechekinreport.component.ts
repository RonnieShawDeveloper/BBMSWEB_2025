import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {HttpClient} from "@angular/common/http";
import {Phonecheckin} from "../../../models/phonecheckin";
import {doc} from "@angular/fire/firestore";
import {NgForOf, NgIf} from "@angular/common";
import {DomSanitizer} from "@angular/platform-browser";
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapDialogComponent } from './map-dialog/map-dialog.component';

@Component({
  selector: 'app-phonechekinreport',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './phonechekinreport.component.html',
  styleUrl: './phonechekinreport.component.scss'
})
export class PhonechekinreportComponent implements OnInit, OnDestroy {

  phoneCheckins: Phonecheckin[] = [];
  subscription: any[] = [];
  constructor(private httpClient: HttpClient, private fs: AngularFirestore, private sanitizer: DomSanitizer, private dialog: MatDialog) {
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
    // Open a Material dialog with the map component
    this.dialog.open(MapDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      height: 'auto',
      maxHeight: '90vh',
      data: { checkin: c },
      panelClass: 'map-dialog-panel'
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscription.forEach((sub) => {
      sub.unsubscribe();
    })
  }

  get verifiedRecordsCount(): number {
    return this.phoneCheckins.filter(c => c.BBMSID).length;
  }

  protected readonly parseInt = parseInt;
}
