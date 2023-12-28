import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CriminalRegistryRoutingModule } from './criminal-registry-routing.module';
import { CriminalRegistryComponent } from './criminal-registry.component';
import { TableModule} from "primeng/table";
import { PickListModule } from 'primeng/picklist';
import { BailAppTableComponent } from './bail-app-table/bail-app-table.component';
import { TerminationComponent } from './termination/termination.component';
import {FormsModule} from "@angular/forms";


@NgModule({
  declarations: [
    CriminalRegistryComponent,
    BailAppTableComponent,
    TerminationComponent
  ],
    imports: [
        CommonModule,
        CriminalRegistryRoutingModule,
        TableModule,
        PickListModule,
        FormsModule
    ]
})
export class CriminalRegistryModule { }
