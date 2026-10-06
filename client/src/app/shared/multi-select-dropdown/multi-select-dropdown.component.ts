import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrl: './multi-select-dropdown.component.css',
})
export class MultiSelectDropdownComponent {
  @Input() label = '';
  @Input() options: string[] = [];
  @Input() selectedValues: string[] = [];
  @Input() placeholder = 'All';

  @Output() selectionChange = new EventEmitter<string[]>();

  isOpen = false;
  searchTerm = '';

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.isOpen = false;
  }

  @HostListener('window:close-other-dropdowns', ['$event'])
  onOtherDropdownOpened(event: Event): void {
    const customEvt = event as CustomEvent;
    if (customEvt.detail !== this) {
      this.isOpen = false;
    }
  }

  toggleOpen(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm = '';
      try {
        window.dispatchEvent(new CustomEvent('close-other-dropdowns', { detail: this }));
      } catch {}
    }
  }

  get filteredOptions(): string[] {
    if (!this.searchTerm.trim()) {
      return this.options;
    }
    const term = this.searchTerm.trim().toLowerCase();
    return this.options.filter((opt) => opt.toLowerCase().includes(term));
  }

  isSelected(option: string): boolean {
    return this.selectedValues.includes(option);
  }

  toggleOption(option: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    let updated: string[];
    if (this.isSelected(option)) {
      updated = this.selectedValues.filter((v) => v !== option);
    } else {
      updated = [...this.selectedValues, option];
    }
    this.selectionChange.emit(updated);
  }

  selectAll(): void {
    this.selectionChange.emit([...this.options]);
  }

  clearAll(): void {
    this.selectionChange.emit([]);
  }

  get displayText(): string {
    if (!this.selectedValues || this.selectedValues.length === 0) {
      return this.placeholder;
    }
    if (this.selectedValues.length === this.options.length && this.options.length > 0) {
      return 'All';
    }
    if (this.selectedValues.length === 1) {
      return this.selectedValues[0];
    }
    if (this.selectedValues.length === 2) {
      return `${this.selectedValues[0]}, ${this.selectedValues[1]}`;
    }
    return `Selected`;
  }
}
