import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IntakeRecordsComponent } from './intake-records.component';
import { IntakeRecordsSearchComponent } from './intake-records-search/intake-records-search.component';
import { IntakeRecordsCreateComponent } from './intake-records-create/intake-records-create.component';
import { IntakeRecordsDetailsComponent } from './intake-records-details/intake-records-details.component';
import { IntakeRecordsBookingComponent } from './intake-records-booking/intake-records-booking.component';
import { HearingViewComponent } from './hearing-view/hearing-view.component';
import { OffenderPhotoCaptureComponent } from './offender-photo-capture/offender-photo-capture.component';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';

const routes: Routes = [
  {
    path: '',
    component: IntakeRecordsComponent,
    data: {
      breadcrumb: 'Offender Intake and Booking Record'
    }
  }
];

@NgModule({
  declarations: [
    IntakeRecordsComponent,
    IntakeRecordsSearchComponent,
    IntakeRecordsCreateComponent,
    IntakeRecordsDetailsComponent,
    IntakeRecordsBookingComponent,
    HearingViewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TimelineModule,
    CardModule,
    TableModule,
    AccordionModule,
    OffenderPhotoCaptureComponent
  ],
  exports: [
    IntakeRecordsComponent,
    IntakeRecordsSearchComponent,
    IntakeRecordsDetailsComponent,
    IntakeRecordsBookingComponent
  ]
})
export class IntakeRecordsModule { }
