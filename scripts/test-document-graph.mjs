import assert from 'node:assert/strict';
import {test} from 'node:test';
import {neighborhood} from '../src/components/document-graph/neighborhood.ts';

test('local graphs include direct links, backlinks and own tags, not tag siblings', () => {
  const graph = {nodes: ['current', 'out', 'in', 'tag', 'sibling', 'isolated'].map(id => ({id})), edges: [
    {source: 'current', target: 'out', kind: 'link'},
    {source: 'out', target: 'current', kind: 'link'},
    {source: 'in', target: 'current', kind: 'link'},
    {source: 'current', target: 'tag', kind: 'tag'},
    {source: 'sibling', target: 'tag', kind: 'tag'},
  ]};
  const local = neighborhood(graph, 'current');
  assert.deepEqual(local.nodes.map(node => node.id), ['current', 'out', 'in', 'tag']);
  assert.equal(local.edges.length, 3);
  assert.deepEqual(neighborhood(graph, 'isolated'), {nodes: [{id: 'isolated'}], edges: []});
  assert.deepEqual(neighborhood(graph, 'missing'), {nodes: [], edges: []});
});
