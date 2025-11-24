import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { StatisticsReportsComponent } from './statistics-reports/statistics-reports.component';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { BaseChartDirective } from 'ng2-charts';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AdminComponent,
    StatisticsReportsComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    TableModule,
    InputTextModule,
    BaseChartDirective,
    FormsModule
  ]
})
export class AdminModule { }
