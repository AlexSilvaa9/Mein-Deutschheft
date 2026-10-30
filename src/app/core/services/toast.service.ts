import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'danger' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly messages = signal<ToastMessage[]>([]);

  show(message: string, kind: ToastKind = 'info', duration = 3500): void {
    const id = ++this.nextId;
    this.messages.update(messages => [...messages, { id, message, kind }]);
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.messages.update(messages => messages.filter(message => message.id !== id));
  }
}
