import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KioskCheckinRoutingModule } from './kiosk-checkin-routing.module';
import { KioskCheckinComponent } from './kiosk-checkin.component';
import {TableModule} from "primeng/table";
import {FormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";


@NgModule({
  declarations: [
    KioskCheckinComponent
  ],
    imports: [
        CommonModule,
        KioskCheckinRoutingModule,
      TableModule,
      InputTextModule,
      FormsModule,
    ]
})
export class KioskCheckinModule { }
