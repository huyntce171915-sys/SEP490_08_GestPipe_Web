const pad = (value) => String(Math.trunc(Math.abs(value))).padStart(2, '0');

const formatDateTimeWithOffset = (input) => {
  if (!input) {
    return null;
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const offsetMinutes = date.getTimezoneOffset();
  const sign = offsetMinutes <= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetMins = absoluteOffset % 60;

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    'T',
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    `${sign}${pad(offsetHours)}:${pad(offsetMins)}`,
  ].join('');
};

const formatAdminDocument = (adminDoc) => {
  if (!adminDoc) {
    return null;
  }

  const admin =
    typeof adminDoc.toObject === 'function'
      ? adminDoc.toObject({ virtuals: false })
      : { ...adminDoc };

  if (admin._id && typeof admin._id !== 'string') {
    admin._id = admin._id.toString();
  }
  if (admin.id && typeof admin.id !== 'string') {
    admin.id = admin.id.toString();
  }

  if (admin.createdAt) {
    admin.createdAt = formatDateTimeWithOffset(admin.createdAt);
  }
  if (admin.updatedAt) {
    admin.updatedAt = formatDateTimeWithOffset(admin.updatedAt);
  }

  return admin;
};

module.exports = {
  formatDateTimeWithOffset,
  formatAdminDocument,
};

