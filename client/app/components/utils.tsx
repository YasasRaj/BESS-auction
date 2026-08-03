// /**
//  * Formats a JS Date object into a MySQL DATETIME string: YYYY-MM-DD HH:MM:SS
//  */
// const formatForMySQL = (dateObj: Date): string => {
//   const pad = (num: number) => String(num).padStart(2, "0");

//   const year = dateObj.getUTCFullYear();
//   const month = pad(dateObj.getUTCMonth() + 1);
//   const day = pad(dateObj.getUTCDate());
//   const hours = pad(dateObj.getUTCHours());
//   const minutes = pad(dateObj.getUTCMinutes());
//   const seconds = pad(dateObj.getUTCSeconds());

//   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
// };
