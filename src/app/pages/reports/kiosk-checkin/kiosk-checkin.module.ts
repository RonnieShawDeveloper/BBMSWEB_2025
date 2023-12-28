import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KioskCheckinRoutingModule } from './kiosk-checkin-routing.module';
import { KioskCheckinComponent } from './kiosk-checkin.component';


@NgModule({
  declarations: [
    KioskCheckinComponent
  ],
  imports: [
    CommonModule,
    KioskCheckinRoutingModule
  ]
})
export class KioskCheckinModule { }
