import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BailAppReportRoutingModule } from './bail-app-report-routing.module';
import { BailAppReportComponent } from './bail-app-report.component';


@NgModule({
  declarations: [
    BailAppReportComponent
  ],
  imports: [
    CommonModule,
    BailAppReportRoutingModule
  ]
})
export class BailAppReportModule { }
