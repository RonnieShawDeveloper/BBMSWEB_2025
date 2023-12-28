import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DppRoutingModule } from './dpp-routing.module';
import { DppComponent } from './dpp.component';
import {SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";


@NgModule({
  declarations: [
    DppComponent
  ],
    imports: [
        CommonModule,
        DppRoutingModule,
        SharedModule,
        TableModule
    ]
})
export class DppModule { }
