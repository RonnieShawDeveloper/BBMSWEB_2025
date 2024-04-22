import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhoneCheckinRoutingModule } from './phone-checkin-routing.module';
import { PhoneCheckinComponent } from './phone-checkin.component';
import { DocheckinComponent } from './docheckin/docheckin.component';
import {FormsModule} from "@angular/forms";


@NgModule({
  declarations: [
    PhoneCheckinComponent,
    DocheckinComponent
  ],
  imports: [
    CommonModule,
    PhoneCheckinRoutingModule,
    FormsModule
  ]
})
export class PhoneCheckinModule { }
