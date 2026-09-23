import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalPayload {
  id: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private activeModalSubject = new BehaviorSubject<ModalPayload | null>(null);
  activeModal$ = this.activeModalSubject.asObservable();

  openModal(id: string, data?: any) {
    this.activeModalSubject.next({ id, data });
  }

  closeModal() {
    this.activeModalSubject.next(null);
  }

  getActiveModal(): ModalPayload | null {
    return this.activeModalSubject.value;
  }

  isOpen(modalId: string): boolean {
    return this.activeModalSubject.value?.id === modalId;
  }
}