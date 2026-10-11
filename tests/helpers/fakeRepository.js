const crypto = require('node:crypto');

// In-memory stand-in for the MongoDB repository. Behaves like the real one,
// including the duplicate-key error (code 11000) that MongoDB raises for a
// unique index. Every test builds a fresh instance, so tests never share state.
function createFakeRepository() {
  const store = new Map();

  const duplicateError = () => Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
  const hasRoll = (rollNumber, exceptId) =>
    [...store.values()].some((s) => s.rollNumber === rollNumber && String(s._id) !== exceptId);

  return {
    async list(search) {
      const needle = (search || '').toLowerCase();
      const all = [...store.values()];
      const data = needle
        ? all.filter((s) => s.fullName.toLowerCase().includes(needle) || s.rollNumber.toLowerCase().includes(needle))
        : all;
      return { data, total: all.length, courses: new Set(all.map((s) => s.course)).size };
    },
    async findById(id) {
      return store.get(id) || null;
    },
    async create(input) {
      if (hasRoll(input.rollNumber)) throw duplicateError();
      const now = new Date();
      const doc = { _id: crypto.randomBytes(12).toString('hex'), ...input, createdAt: now, updatedAt: now };
      store.set(doc._id, doc);
      return doc;
    },
    async update(id, input) {
      const existing = store.get(id);
      if (!existing) return null;
      if (hasRoll(input.rollNumber, id)) throw duplicateError();
      const doc = { ...existing, ...input, updatedAt: new Date() };
      store.set(id, doc);
      return doc;
    },
    async remove(id) {
      const existing = store.get(id);
      store.delete(id);
      return existing || null;
    }
  };
}

// A repository whose every method fails - used to test database-error handling.
function createFailingRepository(error) {
  const fail = async () => { throw error; };
  return { list: fail, findById: fail, create: fail, update: fail, remove: fail };
}

module.exports = { createFakeRepository, createFailingRepository };
