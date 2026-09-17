import { ExcelImportPanel } from '@/components/imports/ExcelImportPanel';
import { importService } from '@/services/importService';

const EXPECTED_COLUMNS = [
  'Serial Number (optional)',
  'Box IP',
  'Box Details',
  'Location ID',
  'Work Area ID',
  'Manufacturing Date',
  'Hook A Threshold',
  'Hook B Threshold',
];

export const SBoxImportPage = () => (
  <ExcelImportPanel
    title="S-Box Import"
    subtitle="Bulk register S-Box devices from Excel. Omit the Serial Number column or leave cells blank to auto-generate serial numbers."
    importType="sboxes"
    expectedColumns={EXPECTED_COLUMNS}
    onImport={importService.importSboxes}
  />
);
