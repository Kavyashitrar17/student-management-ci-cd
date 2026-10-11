const Student = require('../models/Student');

// All database access lives here. Controllers only talk to this interface,
// which lets the automated tests swap in an in-memory fake (tests/helpers).
// Inputs have ALREADY been validated and converted to plain strings/numbers
// by src/validators, so no user-controlled object can reach a query.

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const mongoRepository = {
  async list(search) {
    const filter = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ fullName: pattern }, { rollNumber: pattern }];
    }
    const [data, total, courses] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).lean(),
      Student.countDocuments({}),
      Student.distinct('course')
    ]);
    return { data, total, courses: courses.length };
  },

  findById(id) {
    return Student.findById(id).lean();
  },

  async create(input) {
    const doc = await Student.create(input);
    return doc.toObject();
  },

  update(id, input) {
    return Student.findByIdAndUpdate(id, input, {
      returnDocument: 'after',
      runValidators: true
    }).lean();
  },

  remove(id) {
    return Student.findByIdAndDelete(id).lean();
  }
};

module.exports = { mongoRepository, escapeRegex };
