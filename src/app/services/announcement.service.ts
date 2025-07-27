import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  // To create a new announcement, change the ID and update the content.
  private readonly currentAnnouncement = {
    id: 3, // Increment this for new announcements
    title: 'NEW! Suretor Administration Interface',
    html: `
      <p>We are excited to announce the launch of the new Suretor Administration Interface!</p>
      <p>This interface is designed to streamline your administrative tasks and enhance your overall experience.</p>
      <p>Key features include:</p>
      <ul>
        <li>Improved user interface—All Suretor Functions located on one page</li>
        <li>Enhanced security features—tracking of Suretors across all courts</li>
        <li>Faster access to critical information</li>
        <li>Customizable sorting</li>
      </ul>
      <p>We encourage you to explore the new interface and provide feedback. Your input is invaluable in helping us improve our services.</p>
      <p>BBMS Development</p>
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
