import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Popover,
  Typography,
} from '@mui/material';

interface MonitoringFilterPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  locationOptions: string[];
  workAreaOptions: string[];
  selectedLocations: Set<string>;
  selectedWorkAreas: Set<string>;
  onLocationToggle: (name: string) => void;
  onWorkAreaToggle: (name: string) => void;
  onLocationSelectAll: () => void;
  onWorkAreaSelectAll: () => void;
  onClear: () => void;
}

const FilterColumn = ({
  title,
  options,
  selected,
  allLabel,
  emptyLabel,
  onToggle,
  onSelectAll,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  allLabel: string;
  emptyLabel: string;
  onToggle: (name: string) => void;
  onSelectAll: () => void;
}) => (
  <Box sx={{ width: 240, display: 'flex', flexDirection: 'column' }}>
    <Typography
      variant="caption"
      fontWeight={800}
      textTransform="uppercase"
      letterSpacing={0.8}
      color="text.secondary"
      mb={0.5}
    >
      {title}
    </Typography>
    <Box sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
      {options.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" py={1}>
          {emptyLabel}
        </Typography>
      ) : (
        <>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={selected.size === 0}
                indeterminate={false}
                disabled={selected.size === 0}
                onChange={() => {
                  if (selected.size > 0) onSelectAll();
                }}
              />
            }
            label={allLabel}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 600 } }}
          />
          {options.map((name) => (
            <FormControlLabel
              key={name}
              control={
                <Checkbox
                  size="small"
                  checked={selected.has(name)}
                  onChange={() => onToggle(name)}
                />
              }
              label={name}
              sx={{
                display: 'flex',
                '& .MuiFormControlLabel-label': { fontSize: '0.85rem' },
              }}
            />
          ))}
        </>
      )}
    </Box>
  </Box>
);

export const MonitoringFilterPopover = ({
  open,
  anchorEl,
  onClose,
  locationOptions,
  workAreaOptions,
  selectedLocations,
  selectedWorkAreas,
  onLocationToggle,
  onWorkAreaToggle,
  onLocationSelectAll,
  onWorkAreaSelectAll,
  onClear,
}: MonitoringFilterPopoverProps) => (
  <Popover
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FilterColumn
          title="Location"
          options={locationOptions}
          selected={selectedLocations}
          allLabel="All Locations"
          emptyLabel="No locations available"
          onToggle={onLocationToggle}
          onSelectAll={onLocationSelectAll}
        />
        <Divider orientation="vertical" flexItem />
        <FilterColumn
          title="Work Area / Zone"
          options={workAreaOptions}
          selected={selectedWorkAreas}
          allLabel="All Work Areas"
          emptyLabel={
            selectedLocations.size === 0
              ? 'Select a location first'
              : 'No work areas available'
          }
          onToggle={onWorkAreaToggle}
          onSelectAll={onWorkAreaSelectAll}
        />
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          onClick={onClear}
          disabled={selectedLocations.size === 0 && selectedWorkAreas.size === 0}
        >
          Clear filters
        </Button>
      </Box>
    </Box>
  </Popover>
);
