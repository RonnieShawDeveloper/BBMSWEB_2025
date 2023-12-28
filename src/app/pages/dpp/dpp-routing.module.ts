import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DppComponent } from './dpp.component';

const routes: Routes = [{ path: '', component: DppComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DppRoutingModule { }
