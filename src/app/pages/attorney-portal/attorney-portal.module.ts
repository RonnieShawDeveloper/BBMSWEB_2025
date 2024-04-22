import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttorneyPortalRoutingModule } from './attorney-portal-routing.module';
import { AttorneyPortalComponent } from './attorney-portal.component';
import {FormsModule} from "@angular/forms";
import {AttorneyClientAdminComponent} from "./attorney-client-admin/attorney-client-admin.component";


@NgModule({
  declarations: [
    AttorneyPortalComponent
  ],
  imports: [
    CommonModule,
    AttorneyPortalRoutingModule,
    FormsModule,
    AttorneyClientAdminComponent
  ]
})
export class AttorneyPortalModule { }
