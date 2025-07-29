import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmailRoutingModule } from './email-routing.module';
import { EmailComponent } from './email.component';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    EmailRoutingModule,
    EmailComponent
  ]
})
export class EmailModule { }
