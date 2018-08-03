const similarBooksExist = require('lib/xyannotations/similar-books-exist');
const generateSetItems = require('lib/xyannotations/generate-items');
const createObjects = require('lib/xyannotations/create-objects');
const setIgnoreList = require('lib/ignore-list/set');
const getIgnoreList = require('lib/ignore-list/get');
const getConfig = require('lib/config/get');
const Calibre = require('node-calibre');
const fs = require('fs-extra');

/**
 * Generate annotations from a Calibre library.
 * @param {GenerateCalibreArguments} args
 */
/**
 * @typedef {object} GenerateCalibreArguments
 * @prop {string|number[]} [ids]
 * @prop {number} [limit]
 * @prop {number} [stopAt]
 * @prop {number} [startAt]
 * @prop {string} [library]
 * @prop {number} [bin]
 * @prop {boolean} [deleteGeneratedFormat]
 * @prop {boolean} [addGeneratedFormat]
 * @prop {boolean} [ignoreBookIfMatchExists]
 * @prop {boolean} [skipBookIfMatchExists]
 */
module.exports = async function(args) {
  try {
    const ignoreList = await getIgnoreList();
    const config = await getConfig();

    const calibre = new Calibre({
      library: args.library,
      execOptions: {
        cwd: args.bin || null,
        maxBuffer: 1000000 * 1024
      }
    });

    const lastBookId = +args.stopAt || 99999999;

    const start = Date.now();
    const limit = args.limit;
    const ids =
      typeof args.ids == 'string'
        ? args.ids.split(',').map(Number)
        : args.ids || [];
    let misses = 0;
    let loops = 0;

    // Loop through books
    for (let i = +args.startAt || 0; i < lastBookId + 1; i++) {
      // Check if we need to exit the loop
      if (ids.length && ids.indexOf(book.id.toString()) == -1) break;
      if (limit && limit <= loops) break;

      // Check if book is ignored
      if (ignoreList.indexOf(i.toString()) > -1) {
        console.log(`Skipping book in ignore list`);
        continue;
      }

      // Load book from Calibre
      const book = JSON.parse(
        await calibre.run('calibredb list', [], {
          'for-machine': null,
          fields:
            'authors,formats,id,identifiers,pubdate,publisher,series,' +
            'series_index,title',
          search: 'id:' + i
        })
      )[0];

      // Book does not exist with id
      if (!book) {
        // Only allow 20 'misses' if stopAt was not provided
        if (++misses > 20 && !args.stopAt) break;

        ignoreList.push(i.toString());
        await setIgnoreList(ignoreList);

        continue;
      } else {
        misses = 0;
      }

      console.log('');
      console.log(`Loading book (${book.id}) ${book.title} - ${book.authors}`);

      // Check for similar matching book
      if (
        (args.ignoreBookIfMatchExists || args.skipBookIfMatchExists) &&
        (await similarBooksExist(book, config))
      ) {
        if (args.ignoreBookIfMatchExists) {
          ignoreList.push(book.id.toString());
          await setIgnoreList(ignoreList);
          console.log(`Ignoring book due to similar matching book(s)`);
        } else {
          console.log(`Skipping book due to similar matching book(s)`);
        }
        continue;
      }

      let format = book.formats.find(f => f.split('.').slice(-1) == 'txt');
      let formatGenerated = false;

      // Generate text format
      if (!format) {
        console.log(`Generating text file`);
        format = book.formats[0];

        if (!format) continue;

        let newFormat = format.split('.');
        newFormat[newFormat.length - 1] = 'txt';
        newFormat = newFormat.join('.');

        await calibre.run('ebook-convert', [format, newFormat]);
        (format = newFormat), (formatGenerated = true);
        console.log(`Text file generated`);
      }

      // Create annotation set with book and config info
      const setId = await createObjects(book, config);
      console.log(`Annotation set ${setId} created`);

      // Read file content, generate items, create items
      console.log(`Generating annotations, this could take a while`);
      const items = await generateSetItems(setId, book, format, config);
      console.log(`${items} annotations generated`);

      // Add book to ignore list
      ignoreList.push(book.id.toString());
      await setIgnoreList(ignoreList);
      console.log(`Book added to ignore list`);

      // Act on generated format
      if (formatGenerated) {
        if (args.addGeneratedFormat) {
          await calibre.run('calibredb add_format', [book.id, format]);
          console.log(`Generated text file added to book as format`);
        } else if (args.deleteGeneratedFormat) {
          await fs.remove(format);
          console.log(`Generated text file deleted`);
        }
      }

      console.log(`Book (${book.id}) finished`);
      loops++;
    }

    console.log(
      `Generation for ${loops} books complete in ${Math.round(
        (Date.now() - start) / 1000
      )} seconds.`
    );
  } catch (e) {
    console.error(e.toString());
  }
};
