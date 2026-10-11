const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Stored upper-case so "cs101" and "CS101" are the same roll number.
    rollNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    course: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    semester: { type: Number, required: true, min: 1, max: 8, validate: Number.isInteger }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Student', studentSchema);
