import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CriminalRegistryRoutingModule } from './criminal-registry-routing.module';
import { CriminalRegistryComponent } from './criminal-registry.component';
import { TableModule} from "primeng/table";
import { PickListModule } from 'primeng/picklist';
import { BailAppTableComponent } from './bail-app-table/bail-app-table.component';
import { CaseManagementComponent } from './case-management/case-management.component';
import { TerminationComponent } from './termination/termination.component';
import {FormsModule} from "@angular/forms";
import {CardModule} from "primeng/card";
import {TagModule} from "primeng/tag";
import {ButtonDirective} from "primeng/button";


@NgModule({
  declarations: [
    CriminalRegistryComponent,
    BailAppTableComponent,
    CaseManagementComponent,
    TerminationComponent
  ],
  imports: [
    CommonModule,
    CriminalRegistryRoutingModule,
    TableModule,
    PickListModule,
    FormsModule,
    CardModule,
    TagModule,
    ButtonDirective
  ]
})
export class CriminalRegistryModule { }
