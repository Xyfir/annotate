import annotateHTML from 'repo/html';

// Modules
import findMarkers from './find-markers';

/**
 * @typedef {object} AnnotationSet
 * @prop {number} id
 * @prop {object[]} items
 */
/**
 * Finds and highlights an annotation set's items within the ebook's rendered
 * HTML.
 * @async
 * @param {EPUBJS.Book} book - An EPUBJS `Book` instance
 * @param {AnnotationSet} set - An annotation set
 */
export default async function(book, set) {

  // Find markers for all Before and After subsearches
  const markers = await findMarkers(book, set.items);

  /** @type {Document} */
  const document = book.rendition.getContents()[0].document;
  const html = document.body.innerHTML;

  // Get current chapter index to compare with chapter in markers
  const chapter = +book.rendition.location.start.index;

  document.body.innerHTML = annotateHTML.insertAnnotations({
    set,
    html,
    chapter,
    markers,
    onclick: (t, k) =>
    `!event.stopPropagation() && ` +
    `parent.postMessage({type: '${t}', key: '${k}', epubjs: true}, '*')`
  });

}