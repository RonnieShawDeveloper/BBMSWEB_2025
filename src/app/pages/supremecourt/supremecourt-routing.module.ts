import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupremecourtComponent } from './supremecourt.component';

const routes: Routes = [{ path: '', component: SupremecourtComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SupremecourtRoutingModule { }
