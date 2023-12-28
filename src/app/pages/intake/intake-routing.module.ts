import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IntakeComponent } from './intake.component';

const routes: Routes = [
  { path: '', component: IntakeComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IntakeRoutingModule { }
