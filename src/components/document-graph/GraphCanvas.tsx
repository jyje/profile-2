import {useEffect, useRef, useState, type ReactElement} from 'react';
import {Button} from '@site/src/components/ui/button';
import styles from '../../pages/wiki/graph.module.css';

export type GraphCanvasNode = {
  id: string;
  title: string;
  group: string;
  isTag?: boolean;
  incoming: number;
  outgoing: number;
};

export type GraphCanvasEdge = {source: string; target: string};

type Props = {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  selectedId: string;
  matchingIds: Set<string>;
  searchActive: boolean;
  enableRadial: boolean;
  label: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  onSelect: (nodeId: string) => void;
  loadErrorLabel: string;
};

type Libraries = {d3: any; PIXI: any};
type RenderNode = {
  simulationData: any;
  core: any;
  halo: any;
  label: any;
  degree: number;
  color: number;
  coreAlpha: number;
  haloAlpha: number;
  labelAlpha: number;
  tint: number;
};
type RenderLink = {simulationData: any; gfx: any; alpha: number; width: number; color: number};

let librariesPromise: Promise<Libraries> | undefined;

function loadScript(src: string): Promise<void> {
  const existing = [...document.scripts].find((script) => script.src === src);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

function loadGraphLibraries(): Promise<Libraries> {
  if (!librariesPromise) {
    librariesPromise = Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js'),
      loadScript('https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.js'),
    ]).then(() => ({
      d3: (window as any).d3,
      PIXI: (window as any).PIXI,
    }));
  }
  return librariesPromise;
}

function resolveColor(value: string, fallback: string): string {
  if (!value) return fallback;
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

function colorNumber(value: string): number {
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return (Number(rgb[1]) << 16) | (Number(rgb[2]) << 8) | Number(rgb[3]);
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return 0x68747a;
  const expanded = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
  return Number.parseInt(expanded, 16);
}

function blendColor(current: number, target: number, amount: number): number {
  if (amount >= 1 || current === target) return target;
  const blendChannel = (shift: number) => {
    const from = (current >> shift) & 0xff;
    const to = (target >> shift) & 0xff;
    if (from === to) return to;
    return Math.max(0, Math.min(255, from + Math.sign(to - from) * Math.max(1, Math.round(Math.abs(to - from) * amount))));
  };
  return (blendChannel(16) << 16) | (blendChannel(8) << 8) | blendChannel(0);
}

function palette(): {groups: Record<string, number>; tag: number; muted: number; border: number; accent: number; text: string; font: string} {
  const root = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => resolveColor(root.getPropertyValue(name).trim(), fallback);
  return {
    groups: {
      knowledge: colorNumber(get('--graph-knowledge', '#680c2c')),
      design: colorNumber(get('--graph-design', '#246276')),
      guide: colorNumber(get('--graph-guide', '#a06a1d')),
      home: colorNumber(get('--graph-home', '#526a75')),
    },
    tag: colorNumber(get('--graph-tag', '#dce8eb')),
    muted: colorNumber(get('--site-muted', '#77858b')),
    border: colorNumber(get('--site-border', '#cbd4d6')),
    accent: colorNumber(get('--site-accent', '#680c2c')),
    text: get('--ifm-font-color-base', '#173744'),
    font: root.getPropertyValue('--ifm-font-family-base').trim() || 'inherit',
  };
}

export default function GraphCanvas({
  nodes,
  edges,
  selectedId,
  matchingIds,
  searchActive,
  enableRadial,
  label,
  zoomInLabel,
  zoomOutLabel,
  resetLabel,
  onSelect,
  loadErrorLabel,
}: Props): ReactElement {
  const mountRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<any>(null);
  const selectedIdRef = useRef(selectedId);
  const matchingIdsRef = useRef(matchingIds);
  const searchActiveRef = useRef(searchActive);
  const onSelectRef = useRef(onSelect);
  const [loadError, setLoadError] = useState(false);

  selectedIdRef.current = selectedId;
  matchingIdsRef.current = matchingIds;
  searchActiveRef.current = searchActive;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const graphMount = mount as HTMLDivElement;

    let cancelled = false;
    let app: any;
    let simulation: any;
    let frame = 0;
    let zoomBehavior: any;
    let resizeObserver: ResizeObserver | undefined;
    let themeObserver: MutationObserver | undefined;
    let currentTransform: any;
    let hoveredNodeId: string | null = null;
    let dragStart = {x: 0, y: 0};
    let dragPointerPosition = {x: 0, y: 0};
    let dragOffset = {x: 0, y: 0};
    let dragDistance = 0;
    let draggingNodeId: string | null = null;
    let width = 0;
    let height = 0;
    const neighborIds = new Map<string, Set<string>>();

    setLoadError(false);

    async function start() {
      try {
        const {d3, PIXI} = await loadGraphLibraries();
        if (cancelled) return;
        if (!d3 || !PIXI) throw new Error('Graph rendering libraries were not available.');

        const bounds = graphMount.getBoundingClientRect();
        width = Math.max(320, bounds.width);
        height = Math.max(360, bounds.height);
        const colors = palette();
        const visitedKey = 'document-graph-visited';
        let visited: Set<string>;
        try {
          visited = new Set(JSON.parse(localStorage.getItem(visitedKey) ?? '[]'));
        } catch {
          visited = new Set();
        }

        const simulationNodes = nodes.map((node) => ({
          ...node,
          text: node.title,
          x: Math.random() * width - width / 2,
          y: Math.random() * height - height / 2,
          vx: 0,
          vy: 0,
        }));
        const nodeById = new Map(simulationNodes.map((node) => [node.id, node]));
        const simulationLinks = edges.flatMap((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) return [];
          if (!neighborIds.has(edge.source)) neighborIds.set(edge.source, new Set());
          if (!neighborIds.has(edge.target)) neighborIds.set(edge.target, new Set());
          neighborIds.get(edge.source)?.add(edge.target);
          neighborIds.get(edge.target)?.add(edge.source);
          return [{source, target}];
        });
        const degree = new Map(simulationNodes.map((node) => [node.id, 0]));
        simulationLinks.forEach(({source, target}) => {
          degree.set(source.id, (degree.get(source.id) ?? 0) + 1);
          degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
        });

        app = new PIXI.Application();
        await app.init({
          width,
          height,
          antialias: true,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          eventMode: 'static',
        });
        if (cancelled) {
          app.destroy(true);
          return;
        }
        const graphCanvas = app.canvas as HTMLCanvasElement;
        graphCanvas.setAttribute('aria-hidden', 'true');
        graphCanvas.style.cursor = 'pointer';
        graphMount.appendChild(graphCanvas);

        const stage = new PIXI.Container();
        app.stage.addChild(stage);
        const linkContainer = new PIXI.Container();
        const nodesContainer = new PIXI.Container();
        const labelsContainer = new PIXI.Container();
        stage.addChild(linkContainer, nodesContainer, labelsContainer);

        const nodeRenderData: RenderNode[] = simulationNodes.map((node) => {
          const color = node.isTag ? colors.tag : (colors.groups[node.group] ?? colors.muted);
          const radius = 2 + Math.sqrt(degree.get(node.id) ?? 0);
          const halo = new PIXI.Graphics();
          halo.circle(0, 0, radius + 4).fill({color: colors.accent, alpha: 0.18});
          halo.alpha = 0;
          nodesContainer.addChild(halo);

          const core = new PIXI.Graphics();
          core.circle(0, 0, radius).fill({color: 0xffffff});
          if (node.isTag) core.stroke({width: 1.5, color: colors.accent});
          core.eventMode = 'static';
          core.cursor = 'pointer';
          nodesContainer.addChild(core);

          const text = new PIXI.Text({
            text: node.text,
            style: {fontSize: 12, fill: colors.text, fontFamily: colors.font},
            resolution: (window.devicePixelRatio || 1) * 2,
          });
          text.anchor.set(0.5, 1.2);
          text.alpha = 0;
          labelsContainer.addChild(text);

          const setHover = (nextId: string | null) => {
            if (draggingNodeId) return;
            hoveredNodeId = nextId;
          };
          core.on('pointerover', () => setHover(node.id));
          core.on('pointerout', () => {
            if (draggingNodeId) return;
            if (hoveredNodeId === node.id) setHover(null);
          });

          return {
            simulationData: node,
            core,
            halo,
            label: text,
            degree: degree.get(node.id) ?? 0,
            color,
            coreAlpha: 1,
            haloAlpha: 0,
            labelAlpha: 0,
            tint: color,
          };
        });

        const linkRenderData: RenderLink[] = simulationLinks.map((link) => {
          const gfx = new PIXI.Graphics();
          gfx.eventMode = 'none';
          linkContainer.addChild(gfx);
          return {simulationData: link, gfx, alpha: 0.5, width: 1, color: colors.border};
        });

        simulation = d3
          .forceSimulation(simulationNodes)
          .force('charge', d3.forceManyBody().strength(-100 * 0.5))
          .force('center', d3.forceCenter().strength(0.3))
          .force('link', d3.forceLink(simulationLinks).distance(30))
          .force(
            'collide',
            d3.forceCollide().radius((node: any) => 2 + Math.sqrt(degree.get(node.id) ?? 0)).iterations(3),
          );
        if (enableRadial) {
          simulation.force('radial', d3.forceRadial((Math.min(width, height) / 2) * 0.8).strength(0.2));
        }

        currentTransform = d3.zoomIdentity;
        const nearestNodeAt = (x: number, y: number) => {
          const point = currentTransform.invert([x, y]);
          const mouseX = point[0] - width / 2;
          const mouseY = point[1] - height / 2;
          let nearest: any = null;
          let nearestDistance = Number.POSITIVE_INFINITY;
          for (const node of simulationNodes) {
            const distance = Math.hypot(mouseX - node.x, mouseY - node.y);
            if (distance < 2 + Math.sqrt(degree.get(node.id) ?? 0) + 10 && distance < nearestDistance) {
              nearest = node;
              nearestDistance = distance;
            }
          }
          return nearest;
        };
        const zoomed = (event: any) => {
          currentTransform = event.transform;
          stage.scale.set(currentTransform.k, currentTransform.k);
          stage.position.set(currentTransform.x, currentTransform.y);
        };
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        zoomBehavior = d3
          .zoom()
          .filter((event: any) => {
            if (event.type === 'mousedown' || event.type === 'touchstart') {
              const point = event.type === 'touchstart' ? event.touches?.[0] : event;
              if (point) {
                const bounds = graphCanvas.getBoundingClientRect();
                if (nearestNodeAt(point.clientX - bounds.left, point.clientY - bounds.top)) return false;
              }
            }
            return !event.ctrlKey && !event.button;
          })
          .extent([[0, 0], [width, height]])
          .scaleExtent([0.25, 4])
          .on('zoom', zoomed);
        zoomRef.current = zoomBehavior;
        d3.select(graphCanvas).call(zoomBehavior);

        const drag = d3
          .drag()
          .container(graphCanvas)
          .subject((event: any) => nearestNodeAt(event.x, event.y))
          .on('start', (event: any) => {
            if (!event.active && !reducedMotion) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            const point = currentTransform.invert([event.x, event.y]);
            dragStart = {x: point[0], y: point[1]};
            dragPointerPosition = {x: event.subject.x, y: event.subject.y};
            dragOffset = {
              x: event.subject.x - (point[0] - width / 2),
              y: event.subject.y - (point[1] - height / 2),
            };
            dragDistance = 0;
            draggingNodeId = event.subject.id;
            hoveredNodeId = event.subject.id;
          })
          .on('drag', (event: any) => {
            const point = currentTransform.invert([event.x, event.y]);
            const nextX = point[0] - width / 2 + dragOffset.x;
            const nextY = point[1] - height / 2 + dragOffset.y;
            const dx = nextX - dragPointerPosition.x;
            const dy = nextY - dragPointerPosition.y;
            const distance = Math.hypot(dx, dy);
            dragDistance += distance;
            dragPointerPosition = {x: nextX, y: nextY};
            event.subject.fx = nextX;
            event.subject.fy = nextY;
            if (reducedMotion) {
              event.subject.x = nextX;
              event.subject.y = nextY;
              event.subject.vx = 0;
              event.subject.vy = 0;
            }

            if (distance > 0 && !reducedMotion) {
              for (const neighborId of neighborIds.get(event.subject.id) ?? []) {
                const neighbor = nodeById.get(neighborId);
                if (!neighbor) continue;
                neighbor.vx += dx * 0.4;
                neighbor.vy += dy * 0.4;
              }
              simulation.alpha(Math.max(simulation.alpha(), 0.45)).restart();
            }
          })
          .on('end', (event: any) => {
            if (!event.active) simulation.alphaTarget(reducedMotion ? 0 : 0.02);
            event.subject.fx = null;
            event.subject.fy = null;
            if (dragDistance >= 18 && !reducedMotion) {
              simulation.alpha(Math.max(simulation.alpha(), 0.5)).restart();
            }
            const releasedNode = nearestNodeAt(event.x, event.y);
            draggingNodeId = null;
            hoveredNodeId = releasedNode?.id ?? null;
            const point = currentTransform.invert([event.x, event.y]);
            if (Math.hypot(point[0] - dragStart.x, point[1] - dragStart.y) < 6) {
              onSelectRef.current(event.subject.id);
              visited.add(event.subject.id);
              localStorage.setItem(visitedKey, JSON.stringify([...visited]));
            }
          });
        d3.select(graphCanvas).call(drag);

        const updateHoveredNode = (event: PointerEvent) => {
          if (draggingNodeId) return;
          const bounds = graphCanvas.getBoundingClientRect();
          const nearest = nearestNodeAt(event.clientX - bounds.left, event.clientY - bounds.top);
          hoveredNodeId = nearest?.id ?? null;
        };
        const clearHoveredNode = () => {
          if (draggingNodeId) return;
          hoveredNodeId = null;
        };
        graphCanvas.addEventListener('pointermove', updateHoveredNode);
        graphCanvas.addEventListener('pointerleave', clearHoveredNode);

        if (reducedMotion) {
          simulation.stop();
          simulation.tick(300);
        } else {
          simulation.alphaTarget(0.02).restart();
        }

        let lastDrawAt = performance.now();
        const draw = () => {
          if (cancelled) return;
          const now = performance.now();
          const elapsed = Math.min(64, now - lastDrawAt);
          lastDrawAt = now;
          const blend = reducedMotion ? 1 : 1 - Math.exp(-elapsed / 140);
          const selected = selectedIdRef.current;
          const hovered = draggingNodeId ?? hoveredNodeId;
          const selectedNeighbors = neighborIds.get(selected) ?? new Set<string>();
          const hoveredNeighbors = hovered ? neighborIds.get(hovered) ?? new Set<string>() : new Set<string>();
          const matching = matchingIdsRef.current;
          const filterActive = searchActiveRef.current;
          const zoomOpacity = Math.max((currentTransform.k - 1) / 3.75, 0);
          for (const item of nodeRenderData) {
            const node = item.simulationData;
            const x = node.x;
            const y = node.y;
            if (x == null || y == null) continue;
            const highlighted = node.id === selected || node.id === hovered || selectedNeighbors.has(node.id) || hoveredNeighbors.has(node.id) || matching.has(node.id);
            const selectedContext = node.id === selected || selectedNeighbors.has(node.id);
            const dimmed = hovered
              ? !hoveredNeighbors.has(node.id) && hovered !== node.id && !selectedContext
              : filterActive && !matching.has(node.id) && !selectedContext;
            item.core.position.set(x + width / 2, y + height / 2);
            item.halo.position.set(x + width / 2, y + height / 2);
            item.label.position.set(x + width / 2, y + height / 2);
            item.coreAlpha += ((dimmed ? 0.22 : 1) - item.coreAlpha) * blend;
            item.haloAlpha += ((node.id === selected || node.id === hovered ? 0.65 : 0) - item.haloAlpha) * blend;
            item.labelAlpha += ((highlighted ? 1 : zoomOpacity) - item.labelAlpha) * blend;
            item.core.alpha = item.coreAlpha;
            item.halo.alpha = item.haloAlpha;
            item.label.alpha = item.labelAlpha;
            const nodeColor = node.id === selected ? colors.accent : visited.has(node.id) ? colors.groups.design : item.color;
            item.tint = blendColor(item.tint, nodeColor, blend);
            item.core.tint = item.tint;
          }

          for (const item of linkRenderData) {
            const link = item.simulationData;
            const source = link.source;
            const target = link.target;
            if (source.x == null || source.y == null || target.x == null || target.y == null) continue;
            const connectedToHover = source.id === hovered || target.id === hovered;
            const connectedToSelection = source.id === selected || target.id === selected;
            const targetAlpha = hovered ? (connectedToHover ? 0.9 : connectedToSelection ? 0.62 : 0.12) : (connectedToSelection ? 0.62 : 0.5);
            const targetWidth = connectedToHover ? 1.6 : connectedToSelection ? 1.3 : 1;
            const targetColor = connectedToHover || connectedToSelection ? colors.accent : colors.border;
            item.alpha += (targetAlpha - item.alpha) * blend;
            item.width += (targetWidth - item.width) * blend;
            item.color = blendColor(item.color, targetColor, blend);
            item.gfx.clear();
            item.gfx.moveTo(source.x + width / 2, source.y + height / 2);
            item.gfx.lineTo(target.x + width / 2, target.y + height / 2);
            item.gfx.stroke({
              alpha: item.alpha,
              width: item.width,
              color: item.color,
            });
          }

          frame = window.requestAnimationFrame(draw);
        };

        simulation.on('tick', () => {});
        if (!reducedMotion) simulation.restart();
        draw();

        resizeObserver = new ResizeObserver(() => {
          if (!app || !mount) return;
          const next = graphMount.getBoundingClientRect();
          const nextWidth = Math.max(320, next.width);
          const nextHeight = Math.max(360, next.height);
          if (Math.abs(nextWidth - width) < 1 && Math.abs(nextHeight - height) < 1) return;
          width = nextWidth;
          height = nextHeight;
          app.renderer.resize(nextWidth, nextHeight);
          if (enableRadial) {
            simulation.force('radial', d3.forceRadial((Math.min(width, height) / 2) * 0.8).strength(0.2));
          }
          if (reducedMotion) {
            simulation.stop().alpha(0.35).tick(300);
          } else {
            simulation.alpha(0.35).restart();
          }
        });
        resizeObserver.observe(graphMount);

        themeObserver = new MutationObserver(() => {
          const nextColors = palette();
          for (const item of nodeRenderData) {
            item.color = item.simulationData.isTag
              ? nextColors.tag
              : (nextColors.groups[item.simulationData.group] ?? nextColors.muted);
            item.label.style.fill = nextColors.text;
          }
        });
        themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
      } catch (error) {
        if (cancelled) return;
        console.error('[Document Graph] Could not initialize the renderer.', error);
        setLoadError(true);
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      zoomRef.current = null;
      simulation?.stop();
      try {
        app?.destroy(true);
      } catch {
        // Pixi may throw after a WebGL context is lost.
      }
    };
  }, [edges, enableRadial, nodes]);

  function zoom(factor: number) {
    const canvas = mountRef.current?.querySelector('canvas');
    if (!canvas || !(window as any).d3 || !zoomRef.current) return;
    const d3 = (window as any).d3;
    d3.select(canvas).transition().duration(180).call(zoomRef.current.scaleBy, factor);
  }

  return (
    <div className={styles.graph} role="group" aria-label={label}>
      <div ref={mountRef} className={styles.graphMount} />
      <div className={styles.canvasTools}>
        <Button type="button" variant="ghost" size="icon" shape="square" onClick={() => zoom(1.18)} aria-label={zoomInLabel}>+</Button>
        <Button type="button" variant="ghost" size="icon" shape="square" onClick={() => zoom(0.85)} aria-label={zoomOutLabel}>−</Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          shape="square"
          onClick={() => {
            const canvas = mountRef.current?.querySelector('canvas');
            if (canvas && (window as any).d3 && zoomRef.current) {
              (window as any).d3.select(canvas).transition().duration(180).call(zoomRef.current.transform, (window as any).d3.zoomIdentity);
            }
          }}
          aria-label={resetLabel}
        >↺</Button>
      </div>
      {loadError && <p className={styles.rendererError} role="status">{loadErrorLabel}</p>}
    </div>
  );
}
