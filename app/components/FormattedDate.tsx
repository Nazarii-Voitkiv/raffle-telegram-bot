'use client';

interface FormattedDateProps {
  date: string;
}

export default function FormattedDate({ date }: FormattedDateProps) {
  return <>{new Date(date).toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}</>;
}
