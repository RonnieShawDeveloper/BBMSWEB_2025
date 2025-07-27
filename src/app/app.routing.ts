import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules  } from '@angular/router';
import { PagesComponent } from './pages/pages.component';
import { BlankComponent } from './pages/blank/blank.component';
import { SearchComponent } from './pages/search/search.component';
import { NotFoundComponent } from './pages/errors/not-found/not-found.component';
import {AuthGuard} from "./gaurds/auth.guard";
import {JusticeGuard} from "./gaurds/justice.guard";
import {CriminalRegistryGuard} from "./gaurds/criminal-registry.guard";

export const routes: Routes = [
  {
    path: '',
    component: PagesComponent,
    canActivate: [AuthGuard],
    children:[
      { path: '' , loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule), canActivate: [AuthGuard], data: { breadcrumb: 'Dashboard' }  },
      { path: 'intake', loadChildren: () => import('./pages/intake/intake.module').then(m => m.IntakeModule), canActivate: [AuthGuard], data: { breadcrumb: 'Intake' }  },
      { path: 'bookings', loadChildren: () => import('./pages/bookings/bookings.module').then(m => m.BookingsModule), canActivate: [AuthGuard], data: { breadcrumb: 'Bookings' }  },
      { path: 'criminalregistry', canActivate: [AuthGuard, CriminalRegistryGuard], loadChildren: () => import('./pages/criminal-registry/criminal-registry.module').then(m => m.CriminalRegistryModule), data: { breadcrumb: 'Criminal Registry' }   },
      { path: 'supreme_judge', canActivate: [AuthGuard, JusticeGuard], loadChildren: () => import('./pages/supremecourt/supremecourt.module').then(m => m.SupremecourtModule), data: { breadcrumb: 'Supreme Court Bail Hearings' }},
      { path: 'admin', loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule), canActivate: [AuthGuard], data: { breadcrumb: 'BBMS Administration' }},
      { path: 'dpp', loadChildren: () => import('./pages/dpp/dpp.module').then(m => m.DppModule), canActivate: [AuthGuard], data: { breadcrumb: 'Department of Public Prosecution' }},
      { path: 'attorney', loadChildren: () => import('./pages/attorney-portal/attorney-portal.module').then(m => m.AttorneyPortalModule), canActivate: [AuthGuard], data: { breadcrumb: 'Attorney Portal' }},
      { path: 'magistratecourt', loadChildren: () => import('./pages/magistrate-court/magistrate-court.module').then(m => m.MagistrateCourtModule), canActivate: [AuthGuard], data: { breadcrumb: 'Magistrate Court' }},
      { path: 'phonereport', loadChildren: () => import('./pages/reports/phonechekinreport/phonechekinreport.module').then(m => m.PhonechekinreportModule), canActivate: [AuthGuard], data: { breadcrumb: 'Phone Checkin Report' }},
      { path: 'surtor-admin', loadChildren: () => import('./pages/surtor-admin/surtor-admin.module').then(m => m.SurtorAdminModule), canActivate: [AuthGuard], data: { breadcrumb: 'Suretor Administration' }},
      { path: 'forms', loadChildren: () => import('./pages/forms/forms.module').then(m => m.FormsModule), canActivate: [AuthGuard], data: { breadcrumb: 'Approved Forms' } },
      { path: 'blank', component: BlankComponent, canActivate: [AuthGuard], data: { breadcrumb: 'Blank page' } },
      { path: 'search', component: SearchComponent, canActivate: [AuthGuard], data: { breadcrumb: 'Search' } }
    ]
  },
  { path: 'login', loadChildren: () => import('./pages/login/login.module').then(m => m.LoginModule) },
  { path: 'register', loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterModule) },
  { path: 'bailAppReport', loadChildren: () => import('./pages/reports/bail-app-report/bail-app-report.module').then(m => m.BailAppReportModule) },
  { path: 'bailKioskCheckin', loadChildren: () => import('./pages/reports/kiosk-checkin/kiosk-checkin.module').then(m => m.KioskCheckinModule) },
  { path: 'phone', loadChildren: () => import('./phoneapp/phoneapp.module').then(m => m.PhoneappModule) },
  { path: 'checkin', loadChildren: () => import('./pages/phone-checkin/phone-checkin.module').then(m => m.PhoneCheckinModule) },
  { path: 'restapi', loadChildren: () => import('./pages/rest-api/rest-api.module').then(m => m.RestAPIModule) },
  { path: 'clogin', loadChildren: () => import('./pages/chat-login/chat-login.module').then(m => m.ChatLoginModule) },
  { path: 'suretorapp', loadChildren: () => import('./pages/suretor-app/suretor-app.module').then(m => m.SuretorAppModule) },
  { path: 'systemreport', loadChildren: () => import('./pages/reports/system-report/system-report.module').then(m => m.SystemReportModule) },


  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules // <- comment this line for activate lazy load
    })
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule2 { }
