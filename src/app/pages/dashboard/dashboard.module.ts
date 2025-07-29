import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { BaseChartDirective } from "ng2-charts";
import { FormsModule } from "@angular/forms";
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

export const routes: Routes = [
  { path: '', component: DashboardComponent, pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    BaseChartDirective,
    FormsModule,
    MatTabsModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule
  ],
  declarations: [
    DashboardComponent
  ]
})

export class DashboardModule { }
