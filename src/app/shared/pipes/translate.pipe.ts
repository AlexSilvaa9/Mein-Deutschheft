import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslatorService } from '../../core/services/translator.service';

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private translator = inject(TranslatorService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translator.t(key, params);
  }
}
