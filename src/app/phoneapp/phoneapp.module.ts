import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhoneappRoutingModule } from './phoneapp-routing.module';
import { PhoneappComponent } from './phoneapp.component';


@NgModule({
  declarations: [
    PhoneappComponent
  ],
  imports: [
    CommonModule,
    PhoneappRoutingModule
  ]
})
export class PhoneappModule { }
