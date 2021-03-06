import '@babel/polyfill';

import * as AnnotateEPUBJS from '@xyfir/annotate-epubjs';
import * as AnnotateReact from '@xyfir/annotate-react';
import { DialogContainer } from 'react-md';
import annotationSets from './annotation-sets';
import { render } from 'react-dom';
import React from 'react';
import EPUB from 'epubjs';

// This is required for Epub.js to work
window.ePub = EPUB;
// These are just for testing
window.AnnotateReact = AnnotateReact;
window.AnnotateEPUBJS = AnnotateEPUBJS;
window.annotationSets = annotationSets;

class AnnotateTests extends React.Component {
  constructor(props) {
    super(props);

    /**
     * @type {number}
     * The index of the annotation set that is currently being viewed.
     */
    this.set = null;

    /** @type {EPUBJS.Book} */
    this.book = null;

    /**
     * @type {string}
     * The original HTML of the book document's body before the annotations
     *  were inserted.
     */
    this.oghtml = null;

    /**
     * @type {Document}
     * The document of the ebook's iframe.
     */
    this.fdocument = null;

    /** Highlighted items clicked within the book's content. */
    this.clickedItems = [];

    this.state = {
      /**
       * @type {object}
       * The annotation set item being viewed.
       */
      item: null
    };
  }

  async componentDidMount() {
    // Book setup
    window.book = this.book = new EPUB('/src/book.epub', {});
    const bookView = document.getElementById('bookView');

    // Render book to `div#bookView`
    this.book.renderTo(bookView, {
      height: window.getComputedStyle(bookView).height,
      width: window.innerWidth
    });

    try {
      // More book setup
      await this.book.ready;
      await this.book.rendition.display();
      await this.book.locations.generate(1000);

      // Add styles for highlights within book
      this.book.rendition.themes.default({
        'span.xy-annotation': {
          'background-color': 'rgba(133, 193, 233, 0.5)',
          cursor: 'pointer'
        }
      });
      this.book.rendition.themes.update('default');

      // Listen for clicks on a highlight within the book's iframe
      window.addEventListener('message', e => this.onHighlightClick(e));

      this.fdocument = this.book.rendition.getContents()[0].document;
      this.oghtml = this.fdocument.body.innerHTML;
      this.set = -1;

      // Insert annotations, update vars when a new chapter is rendered
      this.book.rendition.on('rendered', () => {
        this.fdocument = this.book.rendition.getContents()[0].document;
        this.oghtml = this.fdocument.body.innerHTML;

        if (this.set > -1) {
          AnnotateEPUBJS.insertAnnotations(this.book, annotationSets[this.set]);
        }
      });
    } catch (err) {
      console.error('Setup error', err);
    }

    this._runTests();
  }

  onPrevPage() {
    this.book.rendition.prev();
  }

  onNextPage() {
    this.book.rendition.next();
  }

  onCycleSets() {
    this.set = annotationSets[this.set + 1] == undefined ? 0 : this.set + 1;
    this.fdocument.body.innerHTML = this.oghtml;
    AnnotateEPUBJS.insertAnnotations(this.book, annotationSets[this.set]);
  }

  onHighlightClick(e) {
    if (!e.data.xy) return;
    clearTimeout(this.timeout);

    const [setId, itemId] = event.data.key.split('-');
    const set = annotationSets.find(s => s.id == setId);
    this.clickedItems.push(set.items.find(i => i.id == itemId));

    this.timeout = setTimeout(() => {
      // Filter out duplicates
      this.clickedItems = this.clickedItems.filter(
        (i1, index, self) => index == self.findIndex(i2 => i2.id === i1.id)
      );

      this.setState({
        item:
          this.clickedItems.length == 1
            ? this.clickedItems[0]
            : this.clickedItems
      });
      this.clickedItems = [];
    }, 10);
  }

  /**
   * These tests are highly flawed and entirely dependent on the book and the
   *  annotation sets. They're better than nothing, but don't assume a pass
   *  here means everything is working perfectly.
   * @todo Validate clicks on highlights
   * @todo Validate total number of nodes/elements in document.body
   */
  async _runTests() {
    try {
      for (let set of annotationSets) {
        console.log('Inserting and validating set #', set.id);
        await AnnotateEPUBJS.insertAnnotations(this.book, set);

        const ans = this.fdocument.querySelectorAll('span.xy-annotation');

        // Validate the number of `span.xy-annotation` elements created
        if (ans.length != set.elements) throw `Bad element count ${ans.length}`;

        // Validate the text content of all highlights
        for (let el of ans) {
          if (set.matches.findIndex(m => m == el.textContent) == -1)
            throw `Bad element content ${el.textContent}`;
        }

        // Reset book's html
        this.fdocument.body.innerHTML = this.oghtml;
      }

      console.log('All tests passed');
    } catch (err) {
      console.error('Test error', err);
    }
  }

  render() {
    const { item } = this.state;

    return (
      <React.Fragment>
        <div id="bookView" />

        <div id="controls">
          <button onClick={() => this.onPrevPage()}>previous</button>
          <button onClick={() => this.onNextPage()}>next</button>
          <button onClick={() => this.onCycleSets()}>cycle sets</button>
        </div>

        <DialogContainer
          id="pick-item-dialog"
          onHide={() => this.setState({ item: null })}
          visible={Array.isArray(item)}
          className="pick-item-dialog"
          aria-label="pick-item-dialog"
          focusOnMount={false}
        >
          {Array.isArray(item) ? (
            <AnnotateReact.ItemPicker
              items={item}
              onPick={i => this.setState({ item: i })}
            />
          ) : null}
        </DialogContainer>

        <DialogContainer
          fullPage
          id="view-annotations-dialog"
          onHide={() => this.setState({ item: null })}
          visible={item && !Array.isArray(item)}
          className="view-annotations-dialog"
          aria-label="view-annotations-dialog"
          focusOnMount={false}
        >
          {item && !Array.isArray(item) ? (
            <AnnotateReact.ViewAnnotations
              annotations={item.annotations}
              onGoToLink={window.open}
              onClose={() => this.setState({ item: null })}
              book={{
                title: 'The Autobiography of Benjamin Franklin',
                authors: 'Benjamin Franklin'
              }}
            />
          ) : null}
        </DialogContainer>
      </React.Fragment>
    );
  }
}

render(<AnnotateTests />, document.getElementById('content'));
