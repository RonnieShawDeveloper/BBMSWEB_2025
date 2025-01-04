import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatLoginComponent } from './chat-login.component';
import {FormsModule} from "@angular/forms";
import {NgForOf} from "@angular/common";

const routes: Routes = [{ path: '', component: ChatLoginComponent }];

@NgModule({
  declarations: [ChatLoginComponent],
  imports: [RouterModule.forChild(routes), FormsModule, NgForOf],
  exports: [RouterModule]
})
export class ChatLoginRoutingModule { }
