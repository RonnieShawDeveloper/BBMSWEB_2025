import { Injectable } from '@angular/core';
import { Settings } from './app.settings.model';

@Injectable()
export class AppSettings {
    public settings = new Settings(
        'BBMS - Bahamas Bail Management System',
        'BBMS - Bahamas Bail Management System',
        {
            menu: 'vertical', //horizontal , vertical
            menuType: 'compact', //default, compact, mini
            showMenu: true,
            navbarIsFixed: true,
            footerIsFixed: true,
            sidebarIsFixed: true,
            showSideChat: false,
            sideChatIsHoverable: true,
            skin:'blue'  //light , dark, blue, green, combined, purple, orange, brown, grey, pink
        }
    )
}
