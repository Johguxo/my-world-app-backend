const { Model, fields, references } = require('./model');
const { Fav } = require('../fav/model');
const { paginationParseParams, sortParseParams, sortingStr } = require('../utils');
const referencesNames = Object.getOwnPropertyNames(references);

// fetch all documents from collection
exports.fetch = async (req, res, next) => {
  const { query = {} } = req;
  const { page, limit, skip } = paginationParseParams(req.query);
  const { sortBy, direction } = sortParseParams(req.query, fields);
  const populate = referencesNames.join(' ');

  let findQuery = {};
  if (query.userId) {
    findQuery = { userId: query.userId };
  }

  const all = Model.find(findQuery)
    .populate(populate)
    .sort(sortingStr(sortBy, direction))
    .skip(skip)
    .limit(limit);

  const count = Model.countDocuments();
  try {
    const [docs, total] = await Promise.all([all.exec(), count.exec()]);
    const pages = Math.ceil(total/limit);
    res.status(200).json({ 
      success: true, 
      data: docs,
      meta: {
        page,
        limit, 
        skip,
        total,
        pages,
      }
    });
  } catch (err) {
    next(new Error(err))
  }
};

exports.read = async (req, res, next) => {
  const { id = null } = req.params;
  const populate = referencesNames.join(' ');
  try {
    const doc = await Model.findById(id).populate(populate).exec();
    if (!doc) {
      const message = `${Model.modelName} not found`;
      next({
        message,
        statusCode: 404,
        level: 'warn'
      })
    } else {
      res.status(200).json({ success: true, data: doc })
    }
  } catch (err) {
    next(new Error(err));
  }
};

exports.updateItem = async (req, res, next) => {
  const populate = referencesNames.join(' ');
  const { id } = req.params;
  const { _id, title, description, link } = req.body
  const newData = { title, description, link }
  try {
    const favUpdated = await Fav.findByIdAndUpdate(_id, {...newData}, { new:true });
    const favList = await Model.findById(id).populate(populate).exec();
    res.status(200);
    res.json({ 
      success: true, 
      message: `${Model.modelName} has been updated`,
      data: favList
    });
  } catch (err) {
    next(new Error(err));
  }
}

exports.addItem = async (req, res, next) => {
  const populate = referencesNames.join(' ');
  const { id } = req.params;
  const body = req.body;

  const newFav = new Fav(body);

  try {
    const favList = await Model.findById(id);
    const favSaved = await newFav.save();

    favList.list.push(favSaved);
    await favList.save();

    const newFavList = await Model.findById(id).populate(populate).exec();
    res.status(200);
    res.json({ 
      success: true, 
      message: `${Model.modelName} has been updated`,
      data: newFavList
    });
  } catch (err) {
    next(new Error(err));
  }
};

exports.create = async (req, res, next) => {
  const body = req.body;
  const { _id } = req.decoded;
  body.userId = _id;

  const document = new Model(body);
  try {
    const doc = await document.save();
    res.status(201); // CREATED
    res.json({ 
      success: true, 
      message: `${Model.modelName} has been created`, 
      data: doc
    });
  } catch (err) {
    next(new Error(err));
  }
};

exports.update = async (req, res, next) => {
  const { id } = req.params;
  const body = req.body;
  try {
    const updated = await Model.findByIdAndUpdate(id, {
      $set: body
    }, { });
    res.status(200).json({ 
      success: true, 
      message: `${Model.modelName} has been updated`,
      data: updated
    });
  } catch (err) {
    next(new Error(err));
  }
};

exports.delete = async (req, res, next) => {
  const { id = null } = req.params;
  try {
    const removed = await Model.deleteOne({ _id: id });
    res.status(200).json({ 
      success: true,
      message: `${Model.modelName} has been deleted`,
      data: removed
    });
  } catch (err) {
    next(new Error(err));
  }
};