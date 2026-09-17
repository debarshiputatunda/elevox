import type { AccountStatus } from '@/types';

export interface LookupOption {
  id: number;
  name: string;
}

export const ACCOUNT_STATUS_OPTIONS: LookupOption[] = [
  { id: 1, name: 'Active' },
  { id: 2, name: 'Inactive' },
  { id: 3, name: 'Blocked' },
];

export const JOB_TITLE_OPTIONS: LookupOption[] = [
  { id: 1, name: 'Administrator' },
  { id: 2, name: 'Manager' },
  { id: 3, name: 'Employee' },
];

export const ROLE_NAME_TO_ID: Record<string, number> = {
  Admin: 1,
  Manager: 2,
  Employee: 3,
};

export const lookupName = (
  options: LookupOption[],
  id: number | undefined,
): string => options.find((o) => o.id === id)?.name ?? '-';

export const toAccountStatus = (status?: string | null): AccountStatus => {
  if (status === 'Inactive' || status === 'Blocked') return status;
  return 'Active';
};
