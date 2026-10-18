// Version 1 aliases remain stable. Add a new named version for breaking schemas.
module.exports = {
  'list-type-2x2': {required: ['name', 'description'], allowed: ['name', 'description']},
  'list-type-image-header': {required: ['name'], allowed: ['name', 'image', 'description', 'start', 'end']},
  'media-figure': {
    required: ['image', 'alt', 'caption'],
    allowed: ['image', 'alt', 'caption', 'credit_label', 'credit_name', 'credit_url', 'source_label', 'source_name', 'source_url'],
  },
};
