import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  // To create a new announcement, change the ID and update the content.
  private readonly currentAnnouncement = {
    id: 1, // Increment this for new announcements
    title: 'New Feature: Page Zoom!',
    html: `
      <p>You can now adjust the size of the application to better fit your screen!</p>
      <p>Use the <i class="fa fa-search-plus"></i> and <i class="fa fa-search-minus"></i> icons in the top-right corner of the header to zoom in and out.</p>
      <p>Your preference will be saved for your next visit.</p>
    `
  };

  private getStorageKey(): string {
    return `announcement_seen_${this.currentAnnouncement.id}`;
  }

  public shouldShowAnnouncement(): boolean {
    try {
      return !localStorage.getItem(this.getStorageKey());
    } catch (e) {
      console.error('Could not access localStorage for announcements', e);
      return false;
    }
  }

  public markAsSeen(): void {
    try {
      localStorage.setItem(this.getStorageKey(), 'true');
    } catch (e) {
      console.error('Could not save announcement status to localStorage', e);
    }
  }

  public getAnnouncement() {
    return {
      title: this.currentAnnouncement.title,
      html: this.currentAnnouncement.html
    };
  }
}
