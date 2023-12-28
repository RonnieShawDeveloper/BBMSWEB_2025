import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AttorneyPortalComponent } from './attorney-portal.component';

const routes: Routes = [{ path: '', component: AttorneyPortalComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AttorneyPortalRoutingModule { }
