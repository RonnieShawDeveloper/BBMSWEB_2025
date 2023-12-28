import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhoneCheckinRoutingModule } from './phone-checkin-routing.module';
import { PhoneCheckinComponent } from './phone-checkin.component';
import { DocheckinComponent } from './docheckin/docheckin.component';
import {GoogleMapsModule} from "@angular/google-maps";
import {FormsModule} from "@angular/forms";


@NgModule({
  declarations: [
    PhoneCheckinComponent,
    DocheckinComponent
  ],
  imports: [
    CommonModule,
    PhoneCheckinRoutingModule,
    GoogleMapsModule,
    FormsModule
  ]
})
export class PhoneCheckinModule { }
