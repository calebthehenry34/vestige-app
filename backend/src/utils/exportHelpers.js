// backend/src/utils/exportHelpers.js
export const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(','),
      ...data.map(item => 
        headers.map(header => {
          let value = item[header];
          // Handle nested objects and arrays
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          // Escape commas and quotes
          value = value ? `"${value.toString().replace(/"/g, '""')}"` : '';
          return value;
        }).join(',')
      )
    ];
    
    return rows.join('\n');
  };