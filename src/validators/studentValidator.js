const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]*$/;
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Not mongoose.isValidObjectId(): that also accepts any 12-character string.
function isValidObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

function validateStudentInput(body) {
  const errors = [];
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  // Only plain strings are accepted, so {"$ne": ""} style objects are rejected here.
  const text = (field, label, { min, max }) => {
    const raw = source[field];
    if (typeof raw !== 'string' || raw.trim() === '') {
      errors.push({ field, message: `${label} is required` });
      return undefined;
    }
    const value = raw.trim();
    if (value.length < min || value.length > max) {
      errors.push({ field, message: `${label} must be ${min}-${max} characters` });
      return undefined;
    }
    return value;
  };

  const fullName = text('fullName', 'Full name', { min: 2, max: 100 });
  const rollNumber = text('rollNumber', 'Roll number', { min: 1, max: 30 });
  const email = text('email', 'Email', { min: 5, max: 254 });
  const course = text('course', 'Course', { min: 2, max: 100 });

  if (rollNumber !== undefined && !ROLL_PATTERN.test(rollNumber)) {
    errors.push({ field: 'rollNumber', message: 'Roll number may contain only letters, digits, - _ /' });
  }
  if (email !== undefined && !EMAIL_PATTERN.test(email)) {
    errors.push({ field: 'email', message: 'Email format is invalid' });
  }

  let semester;
  const rawSemester = source.semester;
  const semesterNumber =
    typeof rawSemester === 'number' ? rawSemester
      : typeof rawSemester === 'string' && /^\d+$/.test(rawSemester.trim()) ? Number(rawSemester)
        : NaN;
  if (rawSemester === undefined || rawSemester === null || rawSemester === '') {
    errors.push({ field: 'semester', message: 'Semester is required' });
  } else if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
    errors.push({ field: 'semester', message: 'Semester must be a whole number from 1 to 8' });
  } else {
    semester = semesterNumber;
  }

  if (errors.length > 0) return { errors };

  return {
    errors,
    value: {
      fullName,
      rollNumber: rollNumber.toUpperCase(),
      email: email.toLowerCase(),
      course,
      semester
    }
  };
}

// Search must be a single short string; arrays/objects (?search[$ne]=x) are rejected.
function parseSearch(query) {
  const raw = query ? query.search : undefined;
  if (raw === undefined) return { value: '' };
  if (typeof raw !== 'string') return { error: 'Search must be a text value' };
  const value = raw.trim();
  if (value.length > 100) return { error: 'Search text must be at most 100 characters' };
  return { value };
}

module.exports = { validateStudentInput, parseSearch, isValidObjectId };
