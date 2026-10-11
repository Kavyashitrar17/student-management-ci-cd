'use strict';

const API = '/api/students';

const el = (id) => document.getElementById(id);
const rowsEl = el('rows');
const stateEl = el('state');
const alertEl = el('alert');
const searchEl = el('search');
const formDialog = el('form-dialog');
const deleteDialog = el('delete-dialog');
const form = el('student-form');

let editingId = null;   // null => adding, otherwise the id being edited
let deletingId = null;
let alertTimer = null;
let searchTimer = null;
let latestRequest = 0;

// ---------- helpers ----------
async function api(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options
    });
  } catch {
    throw { message: 'Cannot reach the server. Check your connection and try again.' };
  }
  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    const err = payload && payload.error ? payload.error : {};
    throw { status: res.status, code: err.code, message: err.message || 'Request failed.', details: err.details };
  }
  return payload;
}

function showAlert(message, type) {
  clearTimeout(alertTimer);
  alertEl.textContent = message;          // textContent => no HTML injection
  alertEl.className = `alert ${type}`;
  alertEl.hidden = false;
  alertTimer = setTimeout(() => { alertEl.hidden = true; }, 6000);
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function setState(message) {
  stateEl.hidden = !message;
  stateEl.textContent = message || '';
}

// ---------- list ----------
async function loadStudents() {
  const requestId = ++latestRequest;
  rowsEl.replaceChildren();
  setState('Loading students...');
  const search = searchEl.value.trim();
  try {
    const { data, meta } = await api(search ? `${API}?search=${encodeURIComponent(search)}` : API);
    if (requestId !== latestRequest) return; // a newer search replaced this one
    renderRows(data);
    el('stat-total').textContent = meta.total;
    el('stat-courses').textContent = meta.courses;
    el('stat-shown').textContent = meta.count;
    if (data.length === 0) {
      setState(search ? `No students match "${search}".` : 'No students yet. Click "Add student" to create the first record.');
    } else {
      setState('');
    }
  } catch (err) {
    if (requestId !== latestRequest) return;
    setState('');
    showAlert(err.message, 'error');
    setState('Could not load students.');
  }
}

function renderRows(students) {
  const fragment = document.createDocumentFragment();
  for (const s of students) {
    const tr = document.createElement('tr');
    tr.append(cell(s.fullName), cell(s.rollNumber), cell(s.email), cell(s.course), cell(s.semester, 'num'));

    const actions = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'row-actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn btn-small';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${s.fullName}`);
    edit.addEventListener('click', () => openForm(s));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn btn-small btn-danger';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete ${s.fullName}`);
    del.addEventListener('click', () => openDelete(s));

    wrap.append(edit, del);
    actions.append(wrap);
    tr.append(actions);
    fragment.append(tr);
  }
  rowsEl.replaceChildren(fragment);
}

// ---------- add / edit ----------
function clearFormErrors() {
  el('form-error').hidden = true;
  form.querySelectorAll('.field-error').forEach((n) => { n.textContent = ''; });
  form.querySelectorAll('.invalid').forEach((n) => n.classList.remove('invalid'));
}

function setFieldError(field, message) {
  const slot = form.querySelector(`.field-error[data-for="${field}"]`);
  const input = form.elements[field];
  if (slot) slot.textContent = message;
  if (input) input.classList.add('invalid');
}

function openForm(student) {
  editingId = student ? student.id : null;
  form.reset();
  clearFormErrors();
  el('form-title').textContent = student ? 'Edit student' : 'Add student';
  if (student) {
    for (const f of ['fullName', 'rollNumber', 'email', 'course']) form.elements[f].value = student[f];
    form.elements.semester.value = String(student.semester);
  }
  formDialog.showModal();
  form.elements.fullName.focus();
}

function readForm() {
  const v = Object.fromEntries(new FormData(form));
  return {
    fullName: String(v.fullName || '').trim(),
    rollNumber: String(v.rollNumber || '').trim(),
    email: String(v.email || '').trim(),
    course: String(v.course || '').trim(),
    semester: v.semester ? Number(v.semester) : ''
  };
}

// Client-side checks for quick feedback. The server validates again - it is the source of truth.
function validateClient(v) {
  const errors = {};
  if (v.fullName.length < 2) errors.fullName = 'Enter the full name (at least 2 characters).';
  if (!v.rollNumber) errors.rollNumber = 'Enter the roll number.';
  else if (!/^[A-Za-z0-9][A-Za-z0-9\-_/]*$/.test(v.rollNumber)) errors.rollNumber = 'Use only letters, digits, - _ /';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = 'Enter a valid email address.';
  if (v.course.length < 2) errors.course = 'Enter the course (at least 2 characters).';
  if (!v.semester) errors.semester = 'Select a semester.';
  return errors;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormErrors();
  const values = readForm();
  const errors = validateClient(values);
  if (Object.keys(errors).length) {
    for (const [field, message] of Object.entries(errors)) setFieldError(field, message);
    return;
  }

  const saveBtn = el('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  try {
    const wasEditing = Boolean(editingId);
    await api(wasEditing ? `${API}/${editingId}` : API, {
      method: wasEditing ? 'PUT' : 'POST',
      body: JSON.stringify(values)
    });
    formDialog.close();
    showAlert(wasEditing ? 'Student updated successfully.' : 'Student added successfully.', 'success');
    await loadStudents();
  } catch (err) {
    if (err.code === 'DUPLICATE_ROLL_NUMBER') {
      setFieldError('rollNumber', 'This roll number already exists.');
    } else if (Array.isArray(err.details)) {
      for (const d of err.details) setFieldError(d.field, d.message);
    } else {
      const box = el('form-error');
      box.textContent = err.message;
      box.hidden = false;
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

// ---------- delete ----------
function openDelete(student) {
  deletingId = student.id;
  el('delete-text').textContent = `This will permanently remove ${student.fullName} (${student.rollNumber}). This cannot be undone.`;
  deleteDialog.showModal();
}

el('delete-confirm').addEventListener('click', async () => {
  const btn = el('delete-confirm');
  btn.disabled = true;
  try {
    await api(`${API}/${deletingId}`, { method: 'DELETE' });
    deleteDialog.close();
    showAlert('Student deleted.', 'success');
  } catch (err) {
    deleteDialog.close();
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    deletingId = null;
  }
  await loadStudents();
});

// ---------- wiring ----------
el('add-btn').addEventListener('click', () => openForm(null));
el('cancel-btn').addEventListener('click', () => formDialog.close());
el('delete-cancel').addEventListener('click', () => deleteDialog.close());
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadStudents, 300);
});

async function checkHealth() {
  const dot = el('health-dot');
  const text = el('health-text');
  try {
    const res = await fetch('/health');
    const body = await res.json();
    dot.className = `status-dot ${res.ok ? 'ok' : 'bad'}`;
    text.textContent = res.ok ? 'Server and database online' : `Database ${body.database}`;
  } catch {
    dot.className = 'status-dot bad';
    text.textContent = 'Server unreachable';
  }
}

checkHealth();
loadStudents();
