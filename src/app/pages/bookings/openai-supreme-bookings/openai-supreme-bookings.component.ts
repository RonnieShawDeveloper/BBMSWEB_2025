import { Component } from '@angular/core';
import { OpenAiService } from 'src/app/services/open-ai-service.service';
import {catchError, forkJoin, of} from "rxjs";
import { map } from 'rxjs/operators';


@Component({
  selector: 'app-openai-supreme-bookings',
  templateUrl: './openai-supreme-bookings.component.html',
  styleUrl: './openai-supreme-bookings.component.scss'
})
export class OpenaiSupremeBookingsComponent {

}
