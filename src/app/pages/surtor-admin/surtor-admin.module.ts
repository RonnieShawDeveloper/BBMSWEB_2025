import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SurtorAdminRoutingModule } from './surtor-admin-routing.module';
import { SurtorAdminComponent } from './surtor-admin.component';
import { AddSuretorComponent } from './add-suretor/add-suretor.component';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonDirective } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

// Angular Material Imports
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    SurtorAdminComponent,
    AddSuretorComponent
  ],
  imports: [
    CommonModule,
    SurtorAdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    TagModule,
    ButtonDirective,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    // Angular Material Modules
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  providers: [
    MessageService,
    ConfirmationService
  ]
})
export class SurtorAdminModule { }
