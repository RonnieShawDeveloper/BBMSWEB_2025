import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhoneCheckinComponent } from './phone-checkin.component';

const routes: Routes = [{ path: '', component: PhoneCheckinComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhoneCheckinRoutingModule { }
