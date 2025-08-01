import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppSettings } from './app.settings';
import { Settings } from './app.settings.model';
import { UpdateService } from './services/update-service.service';
import { UiStateService } from './services/ui-state.service';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
    public settings: Settings;
    public zoomLevel$: Observable<number>;
    private _localZoomLevel = new BehaviorSubject<number>(UiStateService.getDefaultZoom());
    private routerSubscription: Subscription;

    constructor(public appSettings:AppSettings,
                public translate: TranslateService,
                public updateService: UpdateService,
                private uiStateService: UiStateService,
                private router: Router) {
      this.settings = this.appSettings.settings;
      this.zoomLevel$ = this._localZoomLevel.asObservable();
      translate.addLangs(['en','de','fr','ru','tr']);
      translate.setDefaultLang('en');
      translate.use('en');
    }

    ngOnInit() {
      this.routerSubscription = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects === '/login') {
          this.zoomLevel$ = this._localZoomLevel.asObservable();
          this._localZoomLevel.next(UiStateService.getDefaultZoom());
        } else {
          this.zoomLevel$ = this.uiStateService.zoomLevel$;
        }
      });
    }

    ngOnDestroy() {
      if (this.routerSubscription) {
        this.routerSubscription.unsubscribe();
      }
    }
}
