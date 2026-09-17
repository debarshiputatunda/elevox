import { utils, write } from 'xlsx';

export interface HookRecordingSample {
  timestamp: string;
  boxId: number;
  deviceName: string;
  serialNumber: string;
  hookAValue: number;
  hookAPercent: number;
  hookAThreshold: number;
  hookBValue: number;
  hookBPercent: number;
  hookBThreshold: number;
  online: boolean;
}

const HEADERS = [
  'Timestamp',
  'Box ID',
  'Device Name',
  'Serial Number',
  'Hook A Value',
  'Hook A %',
  'Hook A Threshold',
  'Hook B Value',
  'Hook B %',
  'Hook B Threshold',
  'Online',
];

const pad = (value: number): string => String(value).padStart(2, '0');

const buildFileName = (serialNumber: string): string => {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const safeSerial = (serialNumber || 'sbox').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${safeSerial}_hooks_${stamp}.xlsx`;
};

export const downloadHookRecording = (
  samples: HookRecordingSample[],
  serialNumber: string,
): void => {
  const rows = samples.map((sample) => [
    sample.timestamp,
    sample.boxId,
    sample.deviceName,
    sample.serialNumber,
    sample.hookAValue,
    sample.hookAPercent,
    sample.hookAThreshold,
    sample.hookBValue,
    sample.hookBPercent,
    sample.hookBThreshold,
    sample.online ? 'Yes' : 'No',
  ]);

  const worksheet = utils.aoa_to_sheet([HEADERS, ...rows]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Hook Recording');
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildFileName(serialNumber);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
