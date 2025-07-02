import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemReportComponent } from './system-report.component';

const routes: Routes = [{ path: '', component: SystemReportComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SystemReportRoutingModule { }
