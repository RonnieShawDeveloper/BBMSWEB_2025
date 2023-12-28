import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AttorneyPortalRoutingModule } from './attorney-portal-routing.module';
import { AttorneyPortalComponent } from './attorney-portal.component';
import { AttorneyOfRecordComponent } from './attorney-of-record/attorney-of-record.component';
import { DefAdminComponent } from './def-admin/def-admin.component';
import {FormsModule} from "@angular/forms";


@NgModule({
  declarations: [
    AttorneyPortalComponent,
    AttorneyOfRecordComponent,
    DefAdminComponent
  ],
  imports: [
    CommonModule,
    AttorneyPortalRoutingModule,
    FormsModule
  ]
})
export class AttorneyPortalModule { }
