import type { Role } from '@/types';

export type Permission =
  | 'manage' // qo'shish / tahrirlash / o'chirish (odamlar, tuzilma, sozlamalar)
  | 'viewPassport' // pasport va JSHSHIRni to'liq ko'rish
  | 'addReason' // kelmaslik sababini kiritish
  | 'manageUsers'
  | 'export';

const MATRIX: Record<Permission, Role[]> = {
  manage: ['superadmin'],
  manageUsers: ['superadmin'],
  viewPassport: ['superadmin', 'kadrlar'],
  addReason: ['superadmin', 'kadrlar'],
  export: ['superadmin', 'direktor', 'kadrlar'],
};

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[perm].includes(role);
}
