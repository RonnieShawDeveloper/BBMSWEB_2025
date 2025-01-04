import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private openAiApiKey = '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'; // Replace with your OpenAI API key
  private openAiEndpoint = 'https://api.openai.com/v1/chat/completions'; // Endpoint for Chat GPT models
  private openAiModel = 'gpt-3.5-turbo'; // Model to use for completions

}
