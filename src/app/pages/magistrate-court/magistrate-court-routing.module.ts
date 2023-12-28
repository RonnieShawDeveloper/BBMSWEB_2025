import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MagistrateCourtComponent } from './magistrate-court.component';

const routes: Routes = [{ path: '', component: MagistrateCourtComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MagistrateCourtRoutingModule { }
