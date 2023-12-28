import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntakeRoutingModule } from './intake-routing.module';
import { IntakeComponent } from './intake.component';
import { PageOneComponent } from './page-one/page-one.component';
import {FormsModule} from "@angular/forms";
import { AddDefendantComponent } from './add-defendant/add-defendant.component';
import { PageTwoComponent } from './page-two/page-two.component';
import { UpdateComponent } from './update/update.component';
import { ImportComponent } from './import/import.component';

@NgModule({
  declarations: [
    IntakeComponent,
    PageOneComponent,
    AddDefendantComponent,
    PageTwoComponent,
    UpdateComponent,
    ImportComponent
  ],
  imports: [
    CommonModule,
    IntakeRoutingModule,
    FormsModule
  ]
})
export class IntakeModule { }
