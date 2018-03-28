/**
 * In reality, you probably wouldn't have multiple sets each containing a
 *  single item, but for our purposes it makes testing more accurate. Only the
 *  `id` and `items` properties (and some others not shown here) would be
 *  expected in an actual annotation set.
 */
export default [{
  id: 1,
  items: [{
    id: 1,
    title: 'Benjamin Franklin',
    searches: [
      {main: 'Benjamin Franklin'},
      {main: 'Franklin'},
      {main: 'FRANKLIN'}
    ],
    annotations: [{
      type: 3,
      name: 'Search',
      value: 'Benjamin Franklin',
      context: 'Autobiography'
    }]
  }],
  elements: 77,
  matches: [
    'Benjamin Franklin',
    'Franklin',
    'FRANKLIN'
  ]
}, {
  id: 2,
  items: [{
    id: 2,
    title: 'EBook #20203',
    searches: [{
      main: 'EBook #[0-9]{5}',
      regex: true
    }],
    annotations: [{
      type: 2,
      name: 'Link',
      value: 'http://www.gutenberg.org/ebooks/20203'
    }]
  }],
  elements: 1,
  matches: [
    'EBook #20203'
  ]
}, {
  id: 3,
  items: [{
    id: 3,
    title: 'Autobiography of Benjamin Franklin',
    searches: [{
      main: 'Autobiography of Benjamin Franklin',
      after: 'Author:',
      before: 'Title:'
    }],
    annotations: [{
      type: 3,
      name: 'Search',
      value: 'Autobiography of Benjamin Franklin'
    }]
  }],
  elements: 1,
  matches: [
    'Autobiography of Benjamin Franklin'
  ]
}, {
  id: 4,
  items: [{
    id: 4,
    title: 'Frank Woodworth Pine',
    searches: [{
      main: 'Frank .+ Pine',
      regex: true,
      after: 'IllustrT?ator:',
      before: 'Edit(o|0)r:'
    }],
    annotations: [{
      type: 2,
      name: 'Link',
      value: 'http://onlinebooks.library.upenn.edu/webbin/book/lookupname?key=Pine%2C%20Frank%20Woodworth%2C%201869-'
    }]
  }],
  elements: 1,
  matches: [
    'Frank Woodworth Pine'
  ]
}];