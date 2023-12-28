import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupremecourtRoutingModule } from './supremecourt-routing.module';
import { SupremecourtComponent } from './supremecourt.component';
import {TableModule} from "primeng/table";
import { HearingAdminComponent } from './hearing-admin/hearing-admin.component';
import {TabViewModule} from "primeng/tabview";


@NgModule({
  declarations: [
    SupremecourtComponent,
    HearingAdminComponent
  ],
  imports: [
    CommonModule,
    SupremecourtRoutingModule,
    FormsModule,
    TableModule,
    TabViewModule
  ]
})
export class SupremecourtModule { }
