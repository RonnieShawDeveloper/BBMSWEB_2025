import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { StatisticsReportsComponent } from './statistics-reports/statistics-reports.component';

const routes: Routes = [
  { path: '', component: AdminComponent },
  { path: 'reports', component: StatisticsReportsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
