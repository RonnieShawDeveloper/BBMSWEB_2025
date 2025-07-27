import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SurtorAdminComponent } from './surtor-admin.component';

const routes: Routes = [{ path: '', component: SurtorAdminComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SurtorAdminRoutingModule { }
