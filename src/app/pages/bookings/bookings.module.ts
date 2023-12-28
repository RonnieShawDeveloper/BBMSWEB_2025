import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';

import { BookingsRoutingModule } from './bookings-routing.module';
import { BookingsComponent } from './bookings.component';
import {TableModule} from "primeng/table";
import {FormsModule} from "@angular/forms";
import { DefendantMenuComponent } from './defendant-menu/defendant-menu.component';
import {TimelineModule} from "primeng/timeline";
import {CardModule} from "primeng/card";
import { ViewBookingComponent } from './view-booking/view-booking.component';
import {NewBookingComponent} from "./new-booking/new-booking.component";


@NgModule({
  declarations: [
    BookingsComponent,
    DefendantMenuComponent,
    ViewBookingComponent,
    NewBookingComponent
  ],
    imports: [
        CommonModule,
        BookingsRoutingModule,
        TableModule,
        FormsModule,
        TimelineModule,
        CardModule,
        NgOptimizedImage,
    ],
})
export class BookingsModule { }
