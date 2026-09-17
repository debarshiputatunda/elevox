import { ExcelImportPanel } from '@/components/imports/ExcelImportPanel';
import { importService } from '@/services/importService';

const EXPECTED_COLUMNS = ['Work Area Name', 'Location ID'];

export const WorkAreaImportPage = () => (
  <ExcelImportPanel
    title="Work Area Import"
    subtitle="Bulk upload work areas from an Excel spreadsheet"
    importType="work-areas"
    expectedColumns={EXPECTED_COLUMNS}
    onImport={importService.importWorkAreas}
  />
);
