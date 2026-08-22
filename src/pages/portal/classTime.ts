const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DEFAULT_CLASS_TIME_ZONE = 'Australia/Brisbane';
const CLASS_TIME_ZONE_BY_STATE: Record<string, string> = {
  ACT: 'Australia/Sydney',
  NSW: 'Australia/Sydney',
  NT: 'Australia/Darwin',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  VIC: 'Australia/Melbourne',
  WA: 'Australia/Perth',
};

export const formatClassDateLabel = (iso: string, state: string) => {
  const date = new Date(iso);
  const timeZone = CLASS_TIME_ZONE_BY_STATE[state.toUpperCase()] ?? DEFAULT_CLASS_TIME_ZONE;
  const dateParts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const day = dateParts.find((part) => part.type === 'day')?.value ?? '';
  const month = Number(dateParts.find((part) => part.type === 'month')?.value ?? 1) - 1;
  const time = date.toLocaleTimeString('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${day} ${MONTH_NAMES[month]} · ${time}`;
};
