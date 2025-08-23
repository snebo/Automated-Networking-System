import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PhoneNumber } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string | PhoneNumber | undefined | null | unknown): string {
  // Handle null/undefined
  if (!phone) {
    return '';
  }
  
  // Handle string (normal case)
  if (typeof phone === 'string') {
    return phone;
  }
  
  // Handle object with formatted/country properties
  if (typeof phone === 'object' && phone !== null) {
    const phoneObj = phone as Record<string, unknown>;
    // Check for the specific structure causing the error
    if (phoneObj.formatted && typeof phoneObj.formatted === 'string') {
      return phoneObj.formatted;
    }
    if (phoneObj.country && typeof phoneObj.country === 'string') {
      return phoneObj.country;
    }
    // Handle any other object structure - convert to JSON string as fallback
    try {
      return JSON.stringify(phone);
    } catch {
      return '[Complex Object]';
    }
  }
  
  // Fallback for any other type
  return String(phone);
}

export function getPhoneForCall(phone: string | PhoneNumber | undefined | null | unknown): string {
  // Handle null/undefined
  if (!phone) {
    return '';
  }
  
  // Handle string (normal case)
  if (typeof phone === 'string') {
    return phone;
  }
  
  // Handle object with formatted/country properties
  if (typeof phone === 'object' && phone !== null) {
    const phoneObj = phone as Record<string, unknown>;
    // Check for the specific structure causing the error
    if (phoneObj.formatted && typeof phoneObj.formatted === 'string') {
      return phoneObj.formatted;
    }
    if (phoneObj.country && typeof phoneObj.country === 'string') {
      return phoneObj.country;
    }
    // For calling, we need a valid phone number, so return empty if object structure is unknown
    return '';
  }
  
  // Fallback for any other type
  return String(phone);
}

export function formatAddress(address: unknown): string {
  if (!address) {
    return '';
  }
  
  if (typeof address === 'string') {
    return address;
  }
  
  if (typeof address === 'object' && address !== null) {
    const addressObj = address as Record<string, unknown>;
    if (addressObj.formatted && typeof addressObj.formatted === 'string') {
      return addressObj.formatted;
    }
    // Try to construct from parts
    const parts = [];
    if (addressObj.street && typeof addressObj.street === 'string') parts.push(addressObj.street);
    if (addressObj.city && typeof addressObj.city === 'string') parts.push(addressObj.city);
    if (addressObj.state && typeof addressObj.state === 'string') parts.push(addressObj.state);
    if (addressObj.zipCode && typeof addressObj.zipCode === 'string') parts.push(addressObj.zipCode);
    if (parts.length > 0) {
      return parts.join(', ');
    }
    return '[Address object]';
  }
  
  return String(address);
}

// Generic safe formatter to prevent React rendering errors
export function formatForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'object' && value !== null) {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Handle phone number objects
    const phoneObj = value as Record<string, unknown>;
    if (phoneObj.formatted && phoneObj.country) {
      return formatPhone(value);
    }
    
    // Handle address objects
    if (phoneObj.formatted || phoneObj.street || phoneObj.city) {
      return formatAddress(value);
    }
    
    // Handle other objects - try to find a displayable field
    if (phoneObj.name) return String(phoneObj.name);
    if (phoneObj.title) return String(phoneObj.title);
    if (phoneObj.label) return String(phoneObj.label);
    if (phoneObj.value) return String(phoneObj.value);
    
    // Last resort - return a safe string representation
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
}