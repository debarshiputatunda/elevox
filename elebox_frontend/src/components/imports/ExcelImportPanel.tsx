import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckIcon from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/common/PageHeader';
import { importService } from '@/services/importService';
import {
  buildExcelFileFromPreview,
  downloadErrorReport,
  parseExcelPreview,
  type ExcelPreview,
} from '@/utils/excelPreview';
import type { ImportResponse, ImportType } from '@/types';

const PREVIEW_ROW_LIMIT = 50;
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

interface ExcelImportPanelProps {
  title: string;
  subtitle: string;
  importType: ImportType;
  expectedColumns: string[];
  onImport: (file: File) => Promise<ImportResponse>;
}

export const ExcelImportPanel = ({
  title,
  subtitle,
  importType,
  expectedColumns,
  onImport,
}: ExcelImportPanelProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setIsEditMode(false);
    setIsDirty(false);
    setResult(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        enqueueSnackbar('Only .xlsx files are supported', { variant: 'error' });
        return;
      }

      setParsing(true);
      setResult(null);
      setIsEditMode(false);
      setIsDirty(false);
      try {
        const parsed = await parseExcelPreview(file);
        setSelectedFile(file);
        setPreview(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse Excel file';
        enqueueSnackbar(message, { variant: 'error' });
        resetState();
      } finally {
        setParsing(false);
      }
    },
    [enqueueSnackbar, resetState],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0] ?? null;
      void handleFile(file);
    },
    [handleFile],
  );

  const updateCell = (rowIndex: number, header: string, value: string) => {
    setPreview((current) => {
      if (!current) return current;
      const rows = [...current.rows];
      rows[rowIndex] = { ...rows[rowIndex], [header]: value };
      return { ...current, rows };
    });
    setIsDirty(true);
    setResult(null);
  };

  const handleImport = async () => {
    if (!preview || !selectedFile) return;

    setImporting(true);
    try {
      const fileToUpload = isDirty
        ? buildExcelFileFromPreview(preview, selectedFile.name)
        : selectedFile;
      const response = await onImport(fileToUpload);
      setResult(response);
      if (response.failed_rows === 0) {
        enqueueSnackbar(`Successfully imported ${response.success_rows} rows`, {
          variant: 'success',
        });
      } else {
        enqueueSnackbar(
          `Imported ${response.success_rows} rows with ${response.failed_rows} failures`,
          { variant: 'warning' },
        );
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : 'Import failed';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await importService.downloadTemplate(importType);
    } catch {
      enqueueSnackbar('Failed to download template', { variant: 'error' });
    }
  };

  const displayRows = isEditMode
    ? preview?.rows ?? []
    : preview?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];

  const activeStep = result ? 3 : importing ? 2 : preview ? 1 : 0;

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => void handleDownloadTemplate()}
          >
            Download Sample Template
          </Button>
        }
      />

      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{ mb: 3, overflowX: 'auto', '& .MuiStepLabel-label': { fontSize: { xs: '0.7rem', sm: '0.8rem' } } }}
      >
        {['Upload file', 'Preview & validate', 'Import', 'Summary'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper
        variant="outlined"
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          hidden
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
        <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          Drag &amp; drop your Excel file here
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          or click to browse (.xlsx only)
        </Typography>
        {selectedFile && (
          <Chip
            icon={<UploadFileIcon />}
            label={selectedFile.name}
            onDelete={(event) => {
              event.stopPropagation();
              resetState();
            }}
            onClick={(event) => event.stopPropagation()}
          />
        )}
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        Expected columns: {expectedColumns.join(' | ')}
      </Alert>

      {(parsing || importing) && (
        <Box mb={3}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            {parsing ? 'Parsing file...' : 'Importing data...'}
          </Typography>
        </Box>
      )}

      {preview && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            flexWrap="wrap"
            gap={1}
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={600}>
                Excel Preview ({preview.totalRows} rows)
              </Typography>
              {isDirty && (
                <Chip label="Edited" size="small" color="warning" variant="outlined" />
              )}
              {isEditMode && (
                <Chip label="Edit mode" size="small" color="primary" variant="outlined" />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant={isEditMode ? 'contained' : 'outlined'}
                startIcon={isEditMode ? <CheckIcon /> : <EditIcon />}
                onClick={() => setIsEditMode((current) => !current)}
                disabled={importing}
                color={isEditMode ? 'success' : 'primary'}
              >
                {isEditMode ? 'Done Editing' : 'Edit Data'}
              </Button>
              <Button variant="outlined" onClick={resetState} disabled={importing}>
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => void handleImport()}
                disabled={importing || preview.totalRows === 0}
              >
                Start Import
              </Button>
            </Stack>
          </Stack>

          {isEditMode && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Click any cell to edit values. Changes are applied when you start import.
            </Alert>
          )}

          <TableContainer sx={{ maxHeight: isEditMode ? 560 : 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 48 }}>#</TableCell>
                  {preview.headers.map((header) => (
                    <TableCell key={header} sx={{ fontWeight: 600 }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} hover>
                    <TableCell>{rowIndex + 1}</TableCell>
                    {preview.headers.map((header) => (
                      <TableCell key={header} sx={{ p: isEditMode ? 0.5 : undefined }}>
                        {isEditMode ? (
                          <TextField
                            value={row[header] ?? ''}
                            onChange={(event) =>
                              updateCell(rowIndex, header, event.target.value)
                            }
                            size="small"
                            fullWidth
                            variant="outlined"
                            multiline
                            maxRows={3}
                          />
                        ) : (
                          row[header]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!isEditMode && preview.totalRows > PREVIEW_ROW_LIMIT && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Showing first {PREVIEW_ROW_LIMIT} of {preview.totalRows} rows. Use Edit Data to
              view and edit all rows.
            </Typography>
          )}
        </Paper>
      )}

      {result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Import Summary
          </Typography>
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
            <Chip label={`Total: ${result.total_rows}`} />
            <Chip label={`Success: ${result.success_rows}`} color="success" />
            <Chip
              label={`Failed: ${result.failed_rows}`}
              color={result.failed_rows > 0 ? 'error' : 'default'}
            />
          </Stack>

          {result.errors.length > 0 && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>
                  Error Details
                </Typography>
                <Button
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={() =>
                    downloadErrorReport(
                      result.errors,
                      `${importType}_import_errors.csv`,
                    )
                  }
                >
                  Download Error Report
                </Button>
              </Stack>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((error, index) => (
                      <TableRow key={`${error.row}-${index}`}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};
