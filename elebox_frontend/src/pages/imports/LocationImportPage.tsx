import { ExcelImportPanel } from '@/components/imports/ExcelImportPanel';
import { importService } from '@/services/importService';

const EXPECTED_COLUMNS = ['Country ID', 'City ID', 'Location Name'];

export const LocationImportPage = () => (
  <ExcelImportPanel
    title="Location Import"
    subtitle="Bulk upload locations from an Excel spreadsheet"
    importType="locations"
    expectedColumns={EXPECTED_COLUMNS}
    onImport={importService.importLocations}
  />
);
