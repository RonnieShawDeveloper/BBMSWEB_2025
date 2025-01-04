import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MagistrateCourtRoutingModule } from './magistrate-court-routing.module';
import { MagistrateCourtComponent } from './magistrate-court.component';
import { MagistrateHearingComponent } from './magistrate-hearing/magistrate-hearing.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {TabViewModule} from "primeng/tabview";
import {TableModule} from "primeng/table";
import { MagistrateBookingComponent } from './magistrate-booking/magistrate-booking.component';
import {MagistrateSuretorComponent} from "./magistrate-suretor/magistrate-suretor.component";


@NgModule({
  declarations: [
    MagistrateCourtComponent,
    MagistrateHearingComponent,
    MagistrateBookingComponent
  ],
  imports: [
    CommonModule,
    MagistrateCourtRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    TabViewModule,
    TableModule,
    MagistrateSuretorComponent
  ]
})
export class MagistrateCourtModule { }
