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
      { path: '' , loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule), data: { breadcrumb: 'Dashboard' }  },
      { path: 'intake', loadChildren: () => import('./pages/intake/intake.module').then(m => m.IntakeModule), data: { breadcrumb: 'Intake' }  },
      { path: 'bookings', loadChildren: () => import('./pages/bookings/bookings.module').then(m => m.BookingsModule), data: { breadcrumb: 'Bookings' }  },
      { path: 'criminalregistry', canActivate: [CriminalRegistryGuard], loadChildren: () => import('./pages/criminal-registry/criminal-registry.module').then(m => m.CriminalRegistryModule), data: { breadcrumb: 'Criminal Registry' }   },
      { path: 'supreme_judge', canActivate: [JusticeGuard], loadChildren: () => import('./pages/supremecourt/supremecourt.module').then(m => m.SupremecourtModule), data: { breadcrumb: 'Supreme Court Bail Hearings' }},
      { path: 'admin', loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule), data: { breadcrumb: 'BBMS Administration' }},
      { path: 'dpp', loadChildren: () => import('./pages/dpp/dpp.module').then(m => m.DppModule), data: { breadcrumb: 'Department of Public Prosecution' }},
      { path: 'attorney', loadChildren: () => import('./pages/attorney-portal/attorney-portal.module').then(m => m.AttorneyPortalModule), data: { breadcrumb: 'Attorney Portal' }},
      { path: 'magistratecourt', loadChildren: () => import('./pages/magistrate-court/magistrate-court.module').then(m => m.MagistrateCourtModule), data: { breadcrumb: 'Magistrate Court' }},
      { path: 'phonereport', loadChildren: () => import('./pages/reports/phonechekinreport/phonechekinreport.module').then(m => m.PhonechekinreportModule), data: { breadcrumb: 'Phone Checkin Report' }},
      { path: 'blank', component: BlankComponent, data: { breadcrumb: 'Blank page' } },
      { path: 'search', component: SearchComponent, data: { breadcrumb: 'Search' } }
    ]
  },
  { path: 'login', loadChildren: () => import('./pages/login/login.module').then(m => m.LoginModule) },
  { path: 'register', loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterModule) },
  { path: 'bailAppReport', loadChildren: () => import('./pages/reports/bail-app-report/bail-app-report.module').then(m => m.BailAppReportModule) },
  { path: 'bailKioskCheckin', loadChildren: () => import('./pages/reports/kiosk-checkin/kiosk-checkin.module').then(m => m.KioskCheckinModule) },
  { path: 'phone', loadChildren: () => import('./phoneapp/phoneapp.module').then(m => m.PhoneappModule) },
  { path: 'checkin', loadChildren: () => import('./pages/phone-checkin/phone-checkin.module').then(m => m.PhoneCheckinModule) },

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
