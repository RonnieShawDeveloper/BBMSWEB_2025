import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Offender} from "../../../models/offender";
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {GetPaymentPageComponent} from "../get-payment-page/get-payment-page.component";

@Component({
  selector: 'app-attorney-client-admin',
  standalone: true,
  imports: [
    FormsModule,
    GetPaymentPageComponent,
    NgIf
  ],
  templateUrl: './attorney-client-admin.component.html',
  styleUrl: './attorney-client-admin.component.scss'
})
export class AttorneyClientAdminComponent implements OnInit{

  @Output() close: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() client: Offender;
  showPaymentPage: boolean = false;
  showBailApplication: boolean = false;

  constructor() {
  }

  ngOnInit() {
    if(this.client.mainPhoto === undefined || this.client.mainPhoto === '' || this.client.mainPhoto === null) {
      this.client.mainPhoto = '/assets/img/users/user.jpg';
    }
  }

  getCurrentDate() {
    // Return the date as Month Day, Year
    return new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
  }

  doShowPaymentPage() {
    this.showPaymentPage = true;
  }

  closePaymentPage(event: boolean) {
    this.showPaymentPage = false;
    this.showBailApplication = true;
  }

  closePage(event: boolean) {
    this.close.emit(event);
  }
}
