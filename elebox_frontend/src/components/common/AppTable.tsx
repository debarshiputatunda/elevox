import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TableSortLabel,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
  Divider,
} from '@mui/material';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { useIsMobile } from '@/hooks/useResponsive';

export interface Column<T> {
  id: string;
  label: string;
  minWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
  mobilePrimary?: boolean;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
}

interface AppTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowId?: (row: T) => string | number;
}

const cellValue = <T,>(col: Column<T>, row: T): React.ReactNode => {
  if (col.render) return col.render(row);
  if (col.accessor) return col.accessor(row);
  return String((row as Record<string, unknown>)[col.id] ?? '');
};

export function AppTable<T>({
  columns,
  rows,
  total,
  page,
  pageSize,
  loading,
  sortBy,
  sortOrder = 'asc',
  onPageChange,
  onPageSizeChange,
  onSort,
  onRowClick,
  emptyTitle,
  emptyDescription,
  getRowId,
}: AppTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading && rows.length === 0) {
    return <LoadingSkeleton variant={isMobile ? 'card' : 'table'} rows={6} />;
  }

  const pagination = (
    <Box display="flex" justifyContent="flex-end" sx={{ overflowX: 'auto' }}>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          onPageSizeChange(parseInt(e.target.value, 10));
          onPageChange(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
        }}
      />
    </Box>
  );

  if (isMobile) {
    const titleCol = columns.find((col) => col.mobilePrimary) ?? columns.find((col) => col.id !== 'actions');
    const detailCols = columns.filter(
      (col) => col.id !== 'actions' && col !== titleCol && !col.hideOnMobile,
    );
    const actionCol = columns.find((col) => col.id === 'actions');

    return (
      <Box>
        {rows.length === 0 ? (
          <Paper variant="outlined">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((row, idx) => {
              const key = getRowId ? getRowId(row) : idx;
              const body = (
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  {titleCol && (
                    <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ wordBreak: 'break-word' }}>
                      {cellValue(titleCol, row)}
                    </Typography>
                  )}
                  <Stack spacing={0.75}>
                    {detailCols.map((col) => (
                      <Box
                        key={col.id}
                        display="flex"
                        justifyContent="space-between"
                        gap={2}
                        alignItems="flex-start"
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {col.label}
                        </Typography>
                        <Box textAlign="right" sx={{ minWidth: 0, '& *': { fontSize: '0.8rem' } }}>
                          {cellValue(col, row)}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                  {actionCol && (
                    <>
                      <Divider sx={{ my: 1.25 }} />
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {cellValue(actionCol, row)}
                      </Box>
                    </>
                  )}
                </CardContent>
              );

              return (
                <Card key={key} variant="outlined">
                  {onRowClick ? (
                    <CardActionArea onClick={() => onRowClick(row)}>{body}</CardActionArea>
                  ) : (
                    body
                  )}
                </Card>
              );
            })}
          </Stack>
        )}
        {pagination}
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  style={{ minWidth: col.minWidth, fontWeight: 600 }}
                >
                  {col.sortable && onSort ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortOrder : 'asc'}
                      onClick={() => onSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={getRowId ? getRowId(row) : idx}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      {cellValue(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination}
    </Paper>
  );
}
