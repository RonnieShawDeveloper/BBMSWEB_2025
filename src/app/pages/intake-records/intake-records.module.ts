import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IntakeRecordsComponent } from './intake-records.component';
import { IntakeRecordsSearchComponent } from './intake-records-search/intake-records-search.component';
import { IntakeRecordsCreateComponent } from './intake-records-create/intake-records-create.component';
import { IntakeRecordsDetailsComponent } from './intake-records-details/intake-records-details.component';
import { IntakeRecordsBookingComponent } from './intake-records-booking/intake-records-booking.component';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';

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
    IntakeRecordsBookingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TimelineModule,
    CardModule
  ],
  exports: [
    IntakeRecordsComponent
  ]
})
export class IntakeRecordsModule { }
