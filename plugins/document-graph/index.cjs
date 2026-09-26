const {buildNetwork} = require('../content-network.cjs');

module.exports = function documentGraphPlugin(context) {
  return {
    name: 'docusaurus-plugin-document-graph',
    async allContentLoaded({allContent, actions}) {
      const {nodes, edges, unresolved} = await buildNetwork(context, allContent);
      await actions.createData('graph.json', {nodes, edges});
      await actions.createData('link-diagnostics.json', unresolved);
      actions.setGlobalData({nodes, edges});
    },
  };
};
