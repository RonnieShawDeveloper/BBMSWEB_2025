import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BailAppReportComponent } from './bail-app-report.component';

const routes: Routes = [{ path: '', component: BailAppReportComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BailAppReportRoutingModule { }
