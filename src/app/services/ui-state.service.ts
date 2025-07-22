import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  private static readonly ZOOM_KEY = 'app_zoom_level';
  private static readonly DEFAULT_ZOOM = 1.0;
  private static readonly ZOOM_STEP = 0.1;
  private static readonly MIN_ZOOM = 0.7;
  public static readonly MAX_ZOOM = 1.5;

  public static getDefaultZoom(): number {
    return UiStateService.DEFAULT_ZOOM;
  }

  private _zoomLevel$ = new BehaviorSubject<number>(this.getInitialZoom());
  public zoomLevel$ = this._zoomLevel$.asObservable();

  constructor() { }

  private getInitialZoom(): number {
    try {
      const savedZoom = localStorage.getItem(UiStateService.ZOOM_KEY);
      if (savedZoom) {
        const parsedZoom = parseFloat(savedZoom);
        return isNaN(parsedZoom) ? UiStateService.DEFAULT_ZOOM : parsedZoom;
      }
    } catch (e) {
      console.error('Could not access localStorage for zoom level', e);
    }
    return UiStateService.DEFAULT_ZOOM;
  }

  private setZoom(level: number): void {
    const newLevel = Math.max(UiStateService.MIN_ZOOM, Math.min(level, UiStateService.MAX_ZOOM));
    this._zoomLevel$.next(newLevel);
    try {
      localStorage.setItem(UiStateService.ZOOM_KEY, newLevel.toString());
    } catch (e) {
      console.error('Could not save zoom level to localStorage', e);
    }
  }

  public zoomIn(): void {
    this.setZoom(this._zoomLevel$.value + UiStateService.ZOOM_STEP);
  }

  public zoomOut(): void {
    this.setZoom(this._zoomLevel$.value - UiStateService.ZOOM_STEP);
  }

  public getCurrentZoom(): number {
    return this._zoomLevel$.value;
  }
}
