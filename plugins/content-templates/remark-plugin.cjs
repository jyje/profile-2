const yaml = require('js-yaml');

const templates = {
  'list-type-2x2': {
    required: ['name', 'description'],
    allowed: ['name', 'description'],
  },
  'list-type-image-header': {
    required: ['name'],
    allowed: ['name', 'image', 'description', 'start', 'end'],
  },
};

function validateItems(items, template, language) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Expected a non-empty YAML list for ${language}`);
  }

  return items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Item ${index + 1} in ${language} must be a mapping`);
    }

    for (const key of Object.keys(item)) {
      if (!template.allowed.includes(key)) {
        throw new Error(`Unsupported field "${key}" in ${language} item ${index + 1}`);
      }
    }

    for (const key of template.required) {
      if (typeof item[key] !== 'string' || !item[key].trim()) {
        throw new Error(`Field "${key}" is required in ${language} item ${index + 1}`);
      }
    }

    for (const key of ['image', 'description']) {
      if (item[key] !== undefined && item[key] !== null && typeof item[key] !== 'string') {
        throw new Error(`Field "${key}" must be text in ${language} item ${index + 1}`);
      }
    }

    for (const key of ['start', 'end']) {
      if (item[key] !== undefined && item[key] !== null && !['string', 'number'].includes(typeof item[key])) {
        throw new Error(`Field "${key}" must be a year or text in ${language} item ${index + 1}`);
      }
    }

    return item;
  });
}

module.exports = function remarkContentTemplates() {
  return (tree, file) => {
    function visit(parent) {
      if (!parent || !Array.isArray(parent.children)) return;

      parent.children = parent.children.flatMap((node) => {
        if (node.type === 'code' && Object.hasOwn(templates, node.lang)) {
          const template = templates[node.lang];
          try {
            const items = validateItems(yaml.load(node.value), template, node.lang);
            return [{
              type: 'mdxJsxFlowElement',
              name: 'ContentTemplate',
              attributes: [
                {type: 'mdxJsxAttribute', name: 'type', value: node.lang},
                {type: 'mdxJsxAttribute', name: 'itemsJson', value: JSON.stringify(items)},
              ],
              children: [],
              position: node.position,
            }];
          } catch (error) {
            file.fail(`Invalid ${node.lang} template: ${error.message}`, node);
          }
        }

        visit(node);
        return [node];
      });
    }

    visit(tree);
  };
};
