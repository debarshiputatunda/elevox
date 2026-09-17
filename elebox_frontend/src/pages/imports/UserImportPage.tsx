import { ExcelImportPanel } from '@/components/imports/ExcelImportPanel';
import { importService } from '@/services/importService';

const EXPECTED_COLUMNS = [
  'Employee ID',
  'Employee Name',
  'Status ID',
  'Job Title ID',
  'Email',
  'Phone Number',
  'Work Area ID',
  'Location ID',
  'Password',
];

export const UserImportPage = () => (
  <ExcelImportPanel
    title="User Import"
    subtitle="Bulk upload users from an Excel spreadsheet"
    importType="users"
    expectedColumns={EXPECTED_COLUMNS}
    onImport={importService.importUsers}
  />
);
