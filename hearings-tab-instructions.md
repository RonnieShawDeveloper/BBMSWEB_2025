# Instructions for Adding the Hearings Tab to the Intake Records Booking Component

Follow these step-by-step instructions to add the Hearings tab to the intake-records-booking component.

## Step 1: Add the Hearings Tab to the Navigation

In the file `src/app/pages/intake-records/intake-records-booking/intake-records-booking.component.html`, locate the tab navigation section (around line 52):

```html
<!-- Tabs Navigation -->
<ul class="nav nav-tabs">
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'details'" (click)="setActiveTab('details')">
      Booking Details
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'charges'" (click)="setActiveTab('charges')">
      Charges
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'documents'" (click)="setActiveTab('documents')">
      Documents
    </a>
  </li>
<!--        <li class="nav-item">-->
<!--          <a class="nav-link" [class.active]="activeTab === 'events'" (click)="setActiveTab('events')">-->
<!--            Booking Events-->
<!--          </a>-->
<!--        </li>-->
</ul>
```

Add the Hearings tab navigation item just before the commented-out section:

```html
<li class="nav-item">
  <a class="nav-link" [class.active]="activeTab === 'hearings'" (click)="setActiveTab('hearings')">
    Hearings
  </a>
</li>
```

The updated navigation section should look like this:

```html
<!-- Tabs Navigation -->
<ul class="nav nav-tabs">
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'details'" (click)="setActiveTab('details')">
      Booking Details
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'charges'" (click)="setActiveTab('charges')">
      Charges
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'documents'" (click)="setActiveTab('documents')">
      Documents
    </a>
  </li>
  <li class="nav-item">
    <a class="nav-link" [class.active]="activeTab === 'hearings'" (click)="setActiveTab('hearings')">
      Hearings
    </a>
  </li>
<!--        <li class="nav-item">-->
<!--          <a class="nav-link" [class.active]="activeTab === 'events'" (click)="setActiveTab('events')">-->
<!--            Booking Events-->
<!--          </a>-->
<!--        </li>-->
</ul>
```

## Step 2: Add the Hearings Tab Content

In the same file, locate the tab content section. Find the end of the Documents tab content (around line 498):

```html
        </div>
      </div>
    </div>
  </div>
</div>
```

Add the Hearings tab content just after the Documents tab content and before the commented-out Booking Events tab:

```html
<!-- Hearings Tab -->
<div class="tab-pane fade show" [class.active]="activeTab === 'hearings'">
  <div class="card">
    <div class="card-header bg-primary text-white">
      <h6 class="mb-0">Hearings</h6>
    </div>
    <div class="card-body">
      <div *ngIf="hearings.length === 0" class="alert alert-info">
        <h5 class="alert-heading">No Hearings Found</h5>
        <p>This booking has no hearings on record.</p>
      </div>

      <p-table #dt1 *ngIf="hearings.length > 0" [value]="hearings" [paginator]="true"
               [rows]="10" sortField="unixDate" sortMode="single" [sortOrder]="-1"
               [showCurrentPageReport]="true"
               [tableStyle]="{ 'min-width': '50rem' }"
               currentPageReportTemplate="Showing {first} to {last} of {totalRecords} Hearings"
               [globalFilterFields]="['unixDate', 'disposition', 'judgeName']">
        <ng-template pTemplate="caption">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h4 font-weight-bold text-dark">Hearing Records</h2>
            <button type="button" class="btn btn-danger btn-sm" (click)="clearHearingFilters(dt1)">
              <i class="pi pi-filter-slash"></i> Clear Filters
            </button>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th>
              <div class="d-flex align-items-center">
                Application Date <p-sortIcon field="unixDate"></p-sortIcon>
                <p-columnFilter type="text" field="unixDate" class="ml-auto"></p-columnFilter>
              </div>
            </th>
            <th>
              <div class="d-flex align-items-center">
                Status <p-sortIcon field="disposition"></p-sortIcon>
                <p-columnFilter type="text" field="disposition" class="ml-auto"></p-columnFilter>
              </div>
            </th>
            <th>
              <div class="d-flex align-items-center">
                Judge <p-sortIcon field="judgeName"></p-sortIcon>
                <p-columnFilter type="text" field="judgeName" class="ml-auto"></p-columnFilter>
              </div>
            </th>
            <th>
              <div class="d-flex align-items-center">
                Hearing Date <p-sortIcon field="hearingDateUnix"></p-sortIcon>
                <p-columnFilter type="text" field="hearingDateUnix" class="ml-auto"></p-columnFilter>
              </div>
            </th>
            <th class="text-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-hearing>
          <tr>
            <td class="text-center">
              {{ convertUnixDate(hearing.unixDate) }}
            </td>
            <td class="text-center">
              <div class="d-flex flex-wrap justify-content-center">
                <span *ngIf="!hearing.registrarAck && !hearing.grantBailChecked && !hearing.deniedBailChecked" class="badge badge-danger badge-pill m-1">NEW</span>
                <span *ngIf="!hearing.registrarAck && (hearing.grantBailChecked || hearing.deniedBailChecked)" class="badge badge-warning badge-pill m-1">UPDATED</span>
                <span *ngIf="hearing.bailBondIssueDateUnix" class="badge badge-info badge-pill m-1">ON BOND</span>
                <span *ngIf="hearing.releaseOnRecognizance" class="badge badge-success badge-pill border border-danger m-1">RELEASED ON RECOGNIZANCE</span>
                <span *ngIf="hearing.grantBailChecked" class="badge badge-success badge-pill m-1">GRANTED</span>
                <span *ngIf="hearing.deniedBailChecked" class="badge badge-warning badge-pill m-1">DENIED</span>
                <span *ngIf="hearing.elecMonitorChecked" class="badge badge-info badge-pill m-1">MONITOR</span>
                <span *ngIf="hearing.surrenderPassportChecked" class="badge badge-info badge-pill m-1">PASSPORT</span>
                <span *ngIf="checkHearingDate(hearing.hearingDateUnix)" class="badge badge-info badge-pill m-1">HEARING SET</span>
              </div>
            </td>
            <td>{{ hearing.judgeName ? hearing.judgeName : 'NO JUDGE ASSIGNED' }}</td>
            <td class="text-center">
              <ng-container *ngIf="hearing.hearingDateUnix; else noHearingDate">
                {{ convertUnixDate(hearing.hearingDateUnix) }}<br>
                <span class="text-muted small">{{humanizeDate(hearing.hearingDateUnix)}}</span>
              </ng-container>
              <ng-template #noHearingDate>
                <span class="font-weight-bold text-danger">NO HEARING DATE SET</span>
              </ng-template>
            </td>
            <td class="text-center">
              <button type="button" class="btn btn-primary btn-sm" (click)="viewHearing(hearing)">
                <i class="pi pi-eye"></i> View Details
              </button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center py-5 text-muted">No hearings found for this booking.</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  </div>
</div>
```

## Step 3: Add the Hearing Details Modal

Add the following code at the end of the file, just before the closing `</div>` tag:

```html
<!-- Hearing Details Modal -->
<div *ngIf="showHearingDetails" class="modal fade show" style="display: block;" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">Hearing Details</h5>
        <button type="button" class="close text-white" (click)="closeHearingDetails()">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="col-md-6">
            <h6 class="font-weight-bold">Offender Information</h6>
            <p><strong>Name:</strong> {{selectedHearing.offenderName}}</p>
            <p><strong>Application Date:</strong> {{convertUnixDate(selectedHearing.unixDate)}}</p>
          </div>
          <div class="col-md-6">
            <h6 class="font-weight-bold">Hearing Information</h6>
            <p><strong>Status:</strong> 
              <span *ngIf="selectedHearing.grantBailChecked" class="badge badge-success">GRANTED</span>
              <span *ngIf="selectedHearing.deniedBailChecked" class="badge badge-danger">DENIED</span>
              <span *ngIf="!selectedHearing.grantBailChecked && !selectedHearing.deniedBailChecked" class="badge badge-warning">PENDING</span>
            </p>
            <p><strong>Judge:</strong> {{selectedHearing.judgeName || 'Not Assigned'}}</p>
            <p><strong>Hearing Date:</strong> {{selectedHearing.hearingDateUnix ? convertUnixDate(selectedHearing.hearingDateUnix) : 'Not Set'}}</p>
          </div>
        </div>

        <hr>

        <!-- Bail Application Document -->
        <div class="row mb-3">
          <div class="col-12">
            <h6 class="font-weight-bold">Bail Application</h6>
            <a *ngIf="selectedHearing.bailAppLink" [href]="selectedHearing.bailAppLink" target="_blank" class="btn btn-outline-primary btn-sm">
              <i class="fa fa-file-pdf-o mr-1"></i> View Bail Application
            </a>
            <p *ngIf="!selectedHearing.bailAppLink" class="text-muted">No bail application document available.</p>
          </div>
        </div>

        <!-- Bail Bond Document -->
        <div class="row mb-3" *ngIf="selectedHearing.bailBondLink">
          <div class="col-12">
            <h6 class="font-weight-bold">Bail Bond</h6>
            <a [href]="selectedHearing.bailBondLink" target="_blank" class="btn btn-outline-info btn-sm">
              <i class="fa fa-file-pdf-o mr-1"></i> View Bail Bond
            </a>
            <p *ngIf="selectedHearing.bailBondIssueDateUnix"><strong>Issued:</strong> {{convertUnixDate(selectedHearing.bailBondIssueDateUnix)}}</p>
          </div>
        </div>

        <!-- Bail Conditions -->
        <div class="row mb-3" *ngIf="selectedHearing.grantBailChecked">
          <div class="col-12">
            <h6 class="font-weight-bold">Bail Conditions</h6>
            
            <!-- Reporting Requirements -->
            <div *ngIf="selectedHearing.bailReportLocation" class="card mb-3">
              <div class="card-header bg-light">
                <h6 class="mb-0">Reporting Requirements</h6>
              </div>
              <div class="card-body">
                <p><strong>Report Location:</strong> {{selectedHearing.bailReportLocation}}</p>
                <p><strong>Report Days:</strong> {{selectedHearing.bailReportDays}}</p>
                <p><strong>Report Time:</strong> {{selectedHearing.bailReportTime}}</p>
                
                <div class="d-flex flex-wrap">
                  <span *ngIf="selectedHearing.sundayChecked" class="badge badge-secondary m-1">Sunday</span>
                  <span *ngIf="selectedHearing.mondayChecked" class="badge badge-secondary m-1">Monday</span>
                  <span *ngIf="selectedHearing.tuesdayChecked" class="badge badge-secondary m-1">Tuesday</span>
                  <span *ngIf="selectedHearing.wednesdayChecked" class="badge badge-secondary m-1">Wednesday</span>
                  <span *ngIf="selectedHearing.thursdayChecked" class="badge badge-secondary m-1">Thursday</span>
                  <span *ngIf="selectedHearing.fridayChecked" class="badge badge-secondary m-1">Friday</span>
                  <span *ngIf="selectedHearing.saturdayChecked" class="badge badge-secondary m-1">Saturday</span>
                </div>
                
                <div class="mt-2">
                  <span *ngIf="selectedHearing.threepmChecked" class="badge badge-info m-1">Before 3 PM</span>
                  <span *ngIf="selectedHearing.fourpmChecked" class="badge badge-info m-1">Before 4 PM</span>
                  <span *ngIf="selectedHearing.fivepmChecked" class="badge badge-info m-1">Before 5 PM</span>
                  <span *ngIf="selectedHearing.sixpmChecked" class="badge badge-info m-1">Before 6 PM</span>
                  <span *ngIf="selectedHearing.sevenpmChecked" class="badge badge-info m-1">Before 7 PM</span>
                  <span *ngIf="selectedHearing.eightpmChecked" class="badge badge-info m-1">Before 8 PM</span>
                  <span *ngIf="selectedHearing.ninepmChecked" class="badge badge-info m-1">Before 9 PM</span>
                  <span *ngIf="selectedHearing.tenpmChecked" class="badge badge-info m-1">Before 10 PM</span>
                </div>
              </div>
            </div>
            
            <!-- Special Conditions -->
            <div class="card mb-3">
              <div class="card-header bg-light">
                <h6 class="mb-0">Special Conditions</h6>
              </div>
              <div class="card-body">
                <div class="d-flex flex-wrap mb-2">
                  <span *ngIf="selectedHearing.surrenderPassportChecked" class="badge badge-warning m-1">Surrender Passport</span>
                  <span *ngIf="selectedHearing.elecMonitorChecked" class="badge badge-warning m-1">Electronic Monitoring</span>
                  <span *ngIf="selectedHearing.releaseOnRecognizance" class="badge badge-success m-1">Released on Recognizance</span>
                </div>
                
                <div *ngIf="selectedHearing.additionalConditions" class="mt-3">
                  <h6>Additional Conditions:</h6>
                  <p class="text-muted">{{selectedHearing.additionalConditions}}</p>
                </div>
              </div>
            </div>
            
            <!-- Surety Information -->
            <div *ngIf="selectedHearing.suretorName || selectedHearing.suretor2Name" class="card mb-3">
              <div class="card-header bg-light">
                <h6 class="mb-0">Surety Information</h6>
              </div>
              <div class="card-body">
                <div *ngIf="selectedHearing.suretorName" class="mb-3">
                  <h6>Primary Surety:</h6>
                  <p><strong>Name:</strong> {{selectedHearing.suretorName}}</p>
                  <p><strong>NIB:</strong> {{selectedHearing.suretorNIB}}</p>
                </div>
                
                <div *ngIf="selectedHearing.suretor2Name">
                  <h6>Secondary Surety:</h6>
                  <p><strong>Name:</strong> {{selectedHearing.suretor2Name}}</p>
                  <p><strong>NIB:</strong> {{selectedHearing.suretor2NIB}}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Denial Reasons -->
        <div class="row mb-3" *ngIf="selectedHearing.deniedBailChecked">
          <div class="col-12">
            <h6 class="font-weight-bold">Bail Denial Information</h6>
            <div class="card">
              <div class="card-header bg-light">
                <h6 class="mb-0">Reason for Denial</h6>
              </div>
              <div class="card-body">
                <p>{{selectedHearing.deniedBailReason || 'No reason provided'}}</p>
                <p *ngIf="selectedHearing.deniedBailUnixTime"><strong>Denied on:</strong> {{convertUnixDate(selectedHearing.deniedBailUnixTime)}}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Judicial Notes -->
        <div class="row mb-3" *ngIf="selectedHearing.judicialNotes">
          <div class="col-12">
            <h6 class="font-weight-bold">Judicial Notes</h6>
            <div class="card">
              <div class="card-body">
                <p class="text-muted">{{selectedHearing.judicialNotes}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="closeHearingDetails()">Close</button>
      </div>
    </div>
  </div>
</div>
<div *ngIf="showHearingDetails" class="modal-backdrop fade show"></div>
```

## Step 4: Verify the Changes

After making these changes, the Hearings tab should be visible in the intake-records-booking component. When you click on the Hearings tab, it should display a list of hearings for the current booking. Clicking on the "View Details" button for a hearing should open a modal dialog with detailed information about the hearing.

If you encounter any issues, make sure that:
1. The TypeScript component has the necessary properties and methods to support the Hearings tab
2. The TableModule is imported in the intake-records.module.ts file
3. The HTML structure is valid and all tags are properly closed
