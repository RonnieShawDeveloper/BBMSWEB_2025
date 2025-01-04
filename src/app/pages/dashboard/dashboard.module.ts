import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import {BaseChartDirective} from "ng2-charts";
import {FormsModule} from "@angular/forms";

export const routes: Routes = [
  { path: '', component: DashboardComponent, pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    BaseChartDirective,
    FormsModule
  ],
  declarations: [
    DashboardComponent
  ]
})

export class DashboardModule { }
