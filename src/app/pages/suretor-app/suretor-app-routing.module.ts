import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuretorAppComponent } from './suretor-app.component';

const routes: Routes = [{ path: '', component: SuretorAppComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuretorAppRoutingModule { }
