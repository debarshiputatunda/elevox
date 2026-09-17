import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  fullWidth = true,
}: SearchBarProps) => (
  <TextField
    size="small"
    fullWidth={fullWidth}
    placeholder={placeholder}
    inputProps={{ 'aria-label': placeholder }}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon fontSize="small" color="action" />
        </InputAdornment>
      ),
    }}
  />
);
