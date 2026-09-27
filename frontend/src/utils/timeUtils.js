export const getISTDateString = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
};

export const getISTTimeString = () => {
  return new Date().toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }); // hh:mm AM/PM
};

export const formatISTInvoiceDate = () => {
  const d = getISTDateString();
  const [yyyy, mm, dd] = d.split('-');
  return `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY
};

export const convertTo12HourFormat = (timeStr) => {
  if (!timeStr) return '';
  // If already contains AM/PM, just return it
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    return timeStr;
  }
  // Convert HH:mm to hh:mm AM/PM
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeStr; // Fallback
};

export const convertDateToInputFormat = (ddmmyyyy) => {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return ddmmyyyy;
};

export const convertDateFromInputFormat = (yyyymmdd) => {
  if (!yyyymmdd) return '';
  const parts = yyyymmdd.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return yyyymmdd;
};

export const convertTimeToInputFormat = (time12) => {
  if (!time12) return '';
  const match = time12.match(/^(\d{2}):(\d{2})\s?(AM|PM)/i);
  if (!match) return time12;
  let [ , h, m, modifier ] = match;
  h = parseInt(h, 10);
  if (h === 12 && modifier.toUpperCase() === 'AM') h = 0;
  if (h < 12 && modifier.toUpperCase() === 'PM') h += 12;
  return `${h.toString().padStart(2, '0')}:${m}`;
};
