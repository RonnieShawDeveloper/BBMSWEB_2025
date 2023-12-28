import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KioskCheckinComponent } from './kiosk-checkin.component';

const routes: Routes = [{ path: '', component: KioskCheckinComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KioskCheckinRoutingModule { }
