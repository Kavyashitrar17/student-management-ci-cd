const express = require('express');
const { createStudentController } = require('../controllers/studentController');

function createStudentRoutes(repo) {
  const router = express.Router();
  const controller = createStudentController(repo);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getOne);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = { createStudentRoutes };
