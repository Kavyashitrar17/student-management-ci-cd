const { ApiError } = require('../middleware/errorHandler');
const { validateStudentInput, parseSearch, isValidObjectId } = require('../validators/studentValidator');

function toApi(doc) {
  return {
    id: String(doc._id),
    fullName: doc.fullName,
    rollNumber: doc.rollNumber,
    email: doc.email,
    course: doc.course,
    semester: doc.semester,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function checkId(id) {
  if (!isValidObjectId(id)) throw new ApiError(400, 'INVALID_ID', 'Student id is not a valid ID.');
}

function checkBody(body) {
  const { errors, value } = validateStudentInput(body);
  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed.', errors);
  return value;
}

// Express 5 forwards rejected promises to the error handler automatically.
function createStudentController(repo) {
  return {
    async list(req, res) {
      const { value: search, error } = parseSearch(req.query);
      if (error) throw new ApiError(400, 'INVALID_SEARCH', error);
      const { data, total, courses } = await repo.list(search);
      res.json({ data: data.map(toApi), meta: { count: data.length, total, courses } });
    },

    async getOne(req, res) {
      checkId(req.params.id);
      const student = await repo.findById(req.params.id);
      if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
      res.json({ data: toApi(student) });
    },

    async create(req, res) {
      const input = checkBody(req.body);
      const student = await repo.create(input);
      res.status(201).json({ data: toApi(student) });
    },

    async update(req, res) {
      checkId(req.params.id);
      const input = checkBody(req.body);
      const student = await repo.update(req.params.id, input);
      if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
      res.json({ data: toApi(student) });
    },

    async remove(req, res) {
      checkId(req.params.id);
      const student = await repo.remove(req.params.id);
      if (!student) throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
      res.json({ data: toApi(student), message: 'Student deleted.' });
    }
  };
}

module.exports = { createStudentController };
