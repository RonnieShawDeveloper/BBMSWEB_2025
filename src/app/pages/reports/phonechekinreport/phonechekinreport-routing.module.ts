import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhonechekinreportComponent } from './phonechekinreport.component';

const routes: Routes = [{ path: '', component: PhonechekinreportComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhonechekinreportRoutingModule { }
