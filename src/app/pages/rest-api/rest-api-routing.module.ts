import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RestAPIComponent } from './rest-api.component';

const routes: Routes = [{ path: ':afisid', component: RestAPIComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RestAPIRoutingModule { }
