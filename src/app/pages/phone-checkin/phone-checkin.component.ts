import { Component } from '@angular/core';

@Component({
  selector: 'app-phone-checkin',
  templateUrl: './phone-checkin.component.html',
  styleUrls: ['./phone-checkin.component.scss']
})
export class PhoneCheckinComponent {

  agreed = false;

  constructor() {
  }

  agree() {
    this.agreed = true;
  }

  doExit(e) {
    this.agreed = false;
  }

}
