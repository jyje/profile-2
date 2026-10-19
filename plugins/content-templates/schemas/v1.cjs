// Version 1 aliases remain stable. Add a new named version for breaking schemas.
module.exports = {
  'list-type-2x2': {required: ['name', 'description'], allowed: ['name', 'description']},
  'list-type-image-header': {required: ['name'], allowed: ['name', 'image', 'description', 'start', 'end']},
  // One Anatomy figure per fence: name is a directory under static/anatomy/ (and <name>-light/), title is the iframe's accessible name.
  'anatomy-figure': {required: ['name', 'title'], allowed: ['name', 'title'], single: true},
  'media-figure': {
    required: ['image', 'alt', 'caption'],
    allowed: ['image', 'alt', 'caption', 'credit_label', 'credit_name', 'credit_url', 'source_label', 'source_name', 'source_url'],
  },
};
