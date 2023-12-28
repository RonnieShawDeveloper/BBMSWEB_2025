import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhoneappComponent } from './phoneapp.component';

const routes: Routes = [{ path: '', component: PhoneappComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhoneappRoutingModule { }
