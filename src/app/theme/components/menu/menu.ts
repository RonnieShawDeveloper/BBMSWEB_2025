import { Menu } from './menu.model';

export const verticalMenuItems = [
    new Menu (1, 'Dashboard', '/', null, 'tachometer', null, false, 0),
    new Menu (40, 'Intake', '/intake', null, 'sign-in', null, false, 0),
    new Menu (50, 'Bookings', '/bookings', null, 'file', null, false, 0),
    new Menu (60, 'Magistrate Court', '/magistratecourt', null, 'gavel', null, false, 0),
    new Menu (70, 'Supreme Court', null, null, 'gavel', null, true, 0),
    new Menu (71, 'Registrar', '/criminalregistry', null, 'gavel', null, false, 70),
    new Menu (73, 'Judicial Portal', '/supreme_judge', null, 'gavel', null, false, 70),
    new Menu (80, 'Suretor Admin', '/surtor-admin', null, 'money', null, false, 0),
    new Menu (90, 'Messaging', '/email', null, 'envelope-o', null, false, 0),
    new Menu (110, 'Admin', 'admin', null, 'gear', null, false, 0),

]

export const horizontalMenuItems = [
//     new Menu (1, 'ADMIN_NAV.DASHBOARD', '/', null, 'tachometer', null, false, 0),
//     new Menu (40, 'ADMIN_NAV.PAGES', null, null, 'file-text-o', null, true, 0),
//     new Menu (43, 'LOGIN', '/login', null, 'sign-in', null, false, 0),
//     new Menu (44, 'REGISTER', '/register', null, 'registered', null, false, 0),
//     new Menu (45, 'ADMIN_NAV.BLANK', '/blank', null, 'file-o', null, false, 40),
//     new Menu (46, 'ADMIN_NAV.ERROR', '/pagenotfound', null, 'exclamation-circle', null, false, 40),
//     new Menu (200, 'ADMIN_NAV.EXTERNAL_LINK', null, 'http://themeseason.com', 'external-link', '_blank', false, 0)
]
