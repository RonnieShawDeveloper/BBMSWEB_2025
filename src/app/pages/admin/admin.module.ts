import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import {TableModule} from "primeng/table";
import {InputTextModule} from "primeng/inputtext";
import {BaseChartDirective} from "ng2-charts";


@NgModule({
  declarations: [
    AdminComponent
  ],
    imports: [
        CommonModule,
        AdminRoutingModule,
        TableModule,
        InputTextModule,
        BaseChartDirective
    ]
})
export class AdminModule { }
