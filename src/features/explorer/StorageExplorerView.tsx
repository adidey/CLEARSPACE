import { useEffect, useMemo, useRef, useState } from 'react';
import {
  hierarchy,
  HierarchyRectangularNode,
  treemap,
  treemapSquarify,
} from 'd3-hierarchy';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  CornerLeftUp,
  FileCode,
  Folder,
  FolderOpen,
  LayoutGrid,
  ListTree,
  Search,
  Table2,
} from 'lucide-react';
import { RiskIndicator } from '../../components/RiskIndicator';
import {
  findStorageItemByIdOrPath,
  flattenStorageTree,
  getBreadcrumbChain,
} from '../../services/filesystem/types';
import {
  StorageCategory,
  StorageItem,
  StorageUnitMode,
} from '../../types/storage';
import {
  CATEGORY_COLOR_MAP,
  formatBytes,
  formatPercent,
  formatShortDate,
} from '../../utils/format';

type ExplorerDisplayMode = 'treemap' | 'tree' | 'table';
type ExplorerSortField = 'size' | 'name' | 'modified';

interface StorageExplorerViewProps {
  rootItem: StorageItem;
  focusedId: string;
  selectedItemId?: string;
  unitMode: StorageUnitMode;
  excludedFolders: string[];
  onFocusDirectory: (dirId: string) => void;
  onInspectItem: (item: StorageItem) => void;
}

interface TooltipState {
  item: StorageItem;
  x: number;
  y: number;
  percentOfCurrent: number;
}

export function StorageExplorerView({
  rootItem,
  focusedId,
  selectedItemId,
  unitMode,
  excludedFolders,
  onFocusDirectory,
  onInspectItem,
}: StorageExplorerViewProps) {
  const [displayMode, setDisplayMode] =
    useState<ExplorerDisplayMode>('treemap');
  const [sortField, setSortField] = useState<ExplorerSortField>('size');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | StorageCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(['vol-macintosh-hd', 'dir-users', 'dir-user-alex', 'dir-projects', 'dir-user-library'])
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Measure treemap container dimensions via ResizeObserver
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 920,
    height: 500,
  });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 40 && height > 40) {
          setCanvasSize({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayMode]);

  const currentFolder = useMemo(() => {
    return findStorageItemByIdOrPath(rootItem, focusedId) ?? rootItem;
  }, [rootItem, focusedId]);

  const breadcrumbs = useMemo(() => {
    const chain = getBreadcrumbChain(rootItem, currentFolder.id);
    return chain.length > 0 ? chain : [rootItem];
  }, [rootItem, currentFolder.id]);

  const parentFolder =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  // Sort comparator
  const compareItems = useMemo(() => {
    return (a: StorageItem, b: StorageItem) => {
      let cmp = 0;
      if (sortField === 'size') {
        cmp = a.sizeBytes - b.sizeBytes;
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    };
  }, [sortField, sortDirection]);

  // Filtered items for search, category filter, or current directory children
  const activeItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let items = q
      ? flattenStorageTree(currentFolder).filter(
          (it) =>
            it.id !== currentFolder.id &&
            (it.name.toLowerCase().includes(q) ||
              it.path.toLowerCase().includes(q) ||
              (it.associatedProject &&
                it.associatedProject.toLowerCase().includes(q)))
        )
      : [...(currentFolder.children ?? [])];

    if (selectedCategory !== 'ALL') {
      items = items.filter((it) => it.category === selectedCategory);
    }

    return items.sort(compareItems);
  }, [currentFolder, searchQuery, selectedCategory, compareItems]);

  // Compute D3 Treemap nodes (2 levels deep from currentFolder so developers see nested structures clearly!)
  const treemapNodes = useMemo((): HierarchyRectangularNode<StorageItem>[] => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return [];

    // Build a shallow 2-level copy or search-filtered synthetic root
    const q = searchQuery.trim().toLowerCase();
    const treeData: StorageItem = q
      ? {
          ...currentFolder,
          children: activeItems.map((it) => ({ ...it, children: undefined })),
        }
      : {
          ...currentFolder,
          children: (currentFolder.children ?? []).map((child) => ({
            ...child,
            children: child.children?.map((grandChild) => ({
              ...grandChild,
              children: undefined,
            })),
          })),
        };

    if (!treeData.children || treeData.children.length === 0) return [];

    const rootHierarchy = hierarchy<StorageItem>(treeData)
      .sum((d) => (!d.children || d.children.length === 0 ? Math.max(d.sizeBytes, 1) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const layout = treemap<StorageItem>()
      .tile(treemapSquarify)
      .size([canvasSize.width, canvasSize.height])
      .paddingOuter(4)
      .paddingInner(3)
      .paddingTop((node) =>
        node.depth === 1 && node.children && node.children.length > 0 ? 22 : 3
      )
      .round(true);

    const computed = layout(rootHierarchy);
    return computed.descendants().filter((n) => n.depth > 0);
  }, [currentFolder, activeItems, searchQuery, canvasSize]);

  const toggleExpanded = (id: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderTreeRows = (items: StorageItem[], depth = 0): React.ReactNode => {
    const sorted = [...items].sort(compareItems);
    return sorted.map((item) => {
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const isExpanded = expandedNodeIds.has(item.id);
      const isSelected = selectedItemId === item.id;
      const catColor = CATEGORY_COLOR_MAP[item.category];
      const pctOfRoot =
        currentFolder.sizeBytes > 0
          ? Math.min(100, (item.sizeBytes / currentFolder.sizeBytes) * 100)
          : 0;
      const isExcluded = excludedFolders.includes(item.path);

      return (
        <div key={item.id}>
          <div
            onClick={() => onInspectItem(item)}
            onDoubleClick={() => {
              if (hasChildren) onFocusDirectory(item.id);
            }}
            className="flex items-center justify-between gap-4 px-4 py-2 border-b text-xs transition-colors hover:bg-[var(--cs-surface-hover)] cursor-pointer"
            style={{
              borderColor: 'var(--cs-border-subtle)',
              backgroundColor: isSelected
                ? 'var(--cs-surface-elevated)'
                : 'transparent',
            }}
          >
            <div
              className="flex items-center gap-2 min-w-0 flex-1"
              style={{ paddingLeft: `${depth * 20}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(item.id);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 cursor-pointer shrink-0"
                  style={{ color: 'var(--cs-text-muted)' }}
                  aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}

              {hasChildren ? (
                <Folder
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: catColor.hex }}
                />
              ) : (
                <FileCode
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: catColor.hex }}
                />
              )}

              <span
                className="font-medium truncate"
                style={{ color: 'var(--cs-text)' }}
              >
                {item.name}
              </span>

              <span
                className="text-[11px] font-mono truncate hidden lg:inline"
                style={{ color: 'var(--cs-text-muted)' }}
              >
                {item.path}
              </span>

              {isExcluded && (
                <span
                  className="text-[11px] shrink-0"
                  style={{ color: 'var(--cs-warning)' }}
                >
                  · Excluded
                </span>
              )}
            </div>

            <div className="flex items-center gap-5 shrink-0">
              <RiskIndicator risk={item.risk} compact />

              {/* Proportional bar */}
              <div className="w-24 hidden sm:flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 rounded-xs overflow-hidden"
                  style={{ backgroundColor: 'var(--cs-bg)' }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(2, pctOfRoot)}%`,
                      backgroundColor: catColor.hex,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono tabular-nums w-9 text-right"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  {pctOfRoot.toFixed(0)}%
                </span>
              </div>

              <span
                className="font-mono font-medium tabular-nums w-20 text-right"
                style={{ color: 'var(--cs-text)' }}
              >
                {formatBytes(item.sizeBytes, unitMode)}
              </span>

              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusDirectory(item.id);
                  }}
                  className="px-2 py-0.5 rounded border text-[11px] cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--cs-bg)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text-secondary)',
                  }}
                >
                  Enter
                </button>
              ) : (
                <span className="w-[42px]" />
              )}
            </div>
          </div>

          {hasChildren && isExpanded && item.children && (
            <div>{renderTreeRows(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col p-6 lg:px-8 lg:py-5 gap-4 overflow-hidden">
      {/* Toolbar Row 1: Breadcrumbs + Display Mode Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <button
            type="button"
            disabled={!parentFolder}
            onClick={() => parentFolder && onFocusDirectory(parentFolder.id)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text-secondary)',
            }}
            title="Go up one directory"
          >
            <CornerLeftUp className="w-3.5 h-3.5" />
            <span>Up</span>
          </button>

          <nav
            aria-label="Directory Breadcrumbs"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs overflow-x-auto"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
            }}
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.id} className="inline-flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      style={{ color: 'var(--cs-text-muted)' }}
                    >
                      /
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onFocusDirectory(crumb.id)}
                    className="px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      color: isLast
                        ? 'var(--cs-text)'
                        : 'var(--cs-text-secondary)',
                      fontWeight: isLast ? 600 : 400,
                    }}
                  >
                    {crumb.name}
                  </button>
                </span>
              );
            })}
          </nav>

          <span
            className="text-xs font-mono tabular-nums ml-1 shrink-0"
            style={{ color: 'var(--cs-text-muted)' }}
          >
            {formatBytes(currentFolder.sizeBytes, unitMode)}
          </span>
        </div>

        {/* Display Mode Switcher */}
        <div
          className="inline-flex items-center p-0.5 rounded-lg border shrink-0"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          {(
            [
              { id: 'treemap', label: 'Treemap', icon: LayoutGrid },
              { id: 'tree', label: 'Hierarchical List', icon: ListTree },
              { id: 'table', label: 'Detailed Table', icon: Table2 },
            ] as const
          ).map((mode) => {
            const Icon = mode.icon;
            const active = displayMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: active
                    ? 'var(--cs-surface-elevated)'
                    : 'transparent',
                  color: active ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar Row 2: Search + Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border flex-1 max-w-md"
          style={{
            backgroundColor: 'var(--cs-surface)',
            borderColor: 'var(--cs-border)',
          }}
        >
          <Search
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--cs-text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter inside ${currentFolder.name}…`}
            className="w-full bg-transparent text-xs focus:outline-none"
            style={{ color: 'var(--cs-text)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] cursor-pointer"
              style={{ color: 'var(--cs-text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span style={{ color: 'var(--cs-text-muted)' }}>Sort by:</span>
          <div
            className="inline-flex items-center p-0.5 rounded-md border"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
            }}
          >
            {(
              [
                { id: 'size', label: 'Size' },
                { id: 'name', label: 'Name' },
                { id: 'modified', label: 'Modified' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortField(opt.id)}
                className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor:
                    sortField === opt.id
                      ? 'var(--cs-surface-elevated)'
                      : 'transparent',
                  color:
                    sortField === opt.id
                      ? 'var(--cs-text)'
                      : 'var(--cs-text-secondary)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--cs-surface)',
              borderColor: 'var(--cs-border)',
              color: 'var(--cs-text-secondary)',
            }}
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortDirection === 'desc' ? 'Desc' : 'Asc'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar Row 3: Category Filtering Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-0.5 text-xs">
        <span style={{ color: 'var(--cs-text-muted)' }} className="text-[11px] shrink-0">
          Category:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className="px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          style={{
            backgroundColor:
              selectedCategory === 'ALL'
                ? 'var(--cs-surface-elevated)'
                : 'transparent',
            borderColor:
              selectedCategory === 'ALL' ? 'var(--cs-border)' : 'transparent',
            color:
              selectedCategory === 'ALL'
                ? 'var(--cs-text)'
                : 'var(--cs-text-secondary)',
          }}
        >
          All Categories
        </button>
        {Object.values(StorageCategory).map((cat) => {
          const isSelected = selectedCategory === cat;
          const color = CATEGORY_COLOR_MAP[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setSelectedCategory(isSelected ? 'ALL' : cat)
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: isSelected
                  ? 'var(--cs-surface-elevated)'
                  : 'transparent',
                borderColor: isSelected ? 'var(--cs-border)' : 'transparent',
                color: isSelected ? 'var(--cs-text)' : 'var(--cs-text-secondary)',
              }}
            >
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Main Explorer Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 min-h-[360px] rounded-xl border relative overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--cs-surface)',
          borderColor: 'var(--cs-border)',
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        {activeItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
            <FolderOpen
              className="w-7 h-7"
              style={{ color: 'var(--cs-text-muted)' }}
            />
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--cs-text)' }}
            >
              No matching storage items
            </div>
            <p
              className="text-xs max-w-sm"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              {searchQuery
                ? `No files or directories matching "${searchQuery}" were found under ${currentFolder.name}.`
                : 'This item has no nested subdirectories in the demo snapshot.'}
            </p>
          </div>
        ) : displayMode === 'treemap' ? (
          /* DISPLAY MODE 1: INTERACTIVE D3 SQUARIFIED TREEMAP */
          <div className="relative w-full h-full select-none">
            <svg
              width={canvasSize.width}
              height={canvasSize.height}
              className="block w-full h-full"
            >
              {treemapNodes.map((node) => {
                const item = node.data;
                const w = Math.max(0, node.x1 - node.x0);
                const h = Math.max(0, node.y1 - node.y0);
                if (w < 3 || h < 3) return null;

                const isGroupContainer =
                  node.depth === 1 && node.children && node.children.length > 0;
                const catColor = CATEGORY_COLOR_MAP[item.category];
                const isSelected = selectedItemId === item.id;
                const canDrill = Boolean(
                  item.children && item.children.length > 0
                );
                const pct =
                  currentFolder.sizeBytes > 0
                    ? (item.sizeBytes / currentFolder.sizeBytes) * 100
                    : 0;

                if (isGroupContainer) {
                  return (
                    <g
                      key={item.id}
                      transform={`translate(${node.x0},${node.y0})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectItem(item);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onFocusDirectory(item.id);
                      }}
                      onMouseMove={(e) => {
                        const rect =
                          canvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        setTooltip({
                          item,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          percentOfCurrent: pct,
                        });
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        width={w}
                        height={h}
                        rx={5}
                        fill="var(--cs-bg)"
                        stroke={isSelected ? '#A6B8FF' : 'var(--cs-border)'}
                        strokeWidth={isSelected ? 1.5 : 1}
                      />
                      {w > 75 && h > 24 && (
                        <text
                          x={8}
                          y={15}
                          fill="var(--cs-text-secondary)"
                          fontSize={11}
                          fontWeight={600}
                        >
                          {w > 170
                            ? `${item.name} · ${formatBytes(
                                item.sizeBytes,
                                unitMode
                              )}`
                            : item.name.slice(0, Math.floor(w / 7))}
                        </text>
                      )}
                    </g>
                  );
                }

                return (
                  <g
                    key={item.id}
                    transform={`translate(${node.x0},${node.y0})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectItem(item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (canDrill) {
                        onFocusDirectory(item.id);
                      }
                    }}
                    onMouseMove={(e) => {
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({
                        item,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        percentOfCurrent: pct,
                      });
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      width={w}
                      height={h}
                      rx={4}
                      fill={catColor.subtleBg}
                      stroke={isSelected ? catColor.hex : catColor.borderHex}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-opacity duration-150 group-hover:opacity-85"
                    />
                    {/* Subtle top category accent bar inside sufficiently tall tiles */}
                    {h > 28 && w > 36 && (
                      <rect
                        x={0}
                        y={0}
                        width={w}
                        height={2.5}
                        rx={1.5}
                        fill={catColor.hex}
                        fillOpacity={0.85}
                      />
                    )}
                    {w > 64 && h > 34 && (
                      <foreignObject x={7} y={6} width={w - 14} height={h - 10}>
                        <div className="w-full h-full flex flex-col justify-between overflow-hidden pointer-events-none">
                          <div>
                            <div
                              className="text-[11.5px] font-semibold truncate leading-tight"
                              style={{ color: 'var(--cs-text)' }}
                            >
                              {item.name}
                            </div>
                            {h > 54 && w > 100 && (
                              <div
                                className="text-[10px] font-mono truncate mt-0.5"
                                style={{ color: 'var(--cs-text-secondary)' }}
                              >
                                {item.fileTypeLabel}
                              </div>
                            )}
                          </div>
                          {h > 46 && (
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="text-[11px] font-mono font-medium tabular-nums truncate"
                                style={{ color: catColor.hex }}
                              >
                                {formatBytes(item.sizeBytes, unitMode)}
                              </span>
                              {canDrill && w > 120 && (
                                <span
                                  className="text-[10px]"
                                  style={{ color: 'var(--cs-text-muted)' }}
                                >
                                  2× click ↘
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Hover Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-20 w-68 p-3 rounded-lg border shadow-xl text-xs space-y-1.5"
                style={{
                  left: Math.min(
                    Math.max(12, tooltip.x + 14),
                    Math.max(12, canvasSize.width - 284)
                  ),
                  top: Math.min(
                    Math.max(12, tooltip.y + 14),
                    Math.max(12, canvasSize.height - 148)
                  ),
                  backgroundColor: 'var(--cs-sidebar)',
                  borderColor: 'var(--cs-border)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="font-semibold truncate"
                    style={{ color: 'var(--cs-text)' }}
                  >
                    {tooltip.item.name}
                  </span>
                  <span
                    className="font-mono font-semibold tabular-nums shrink-0"
                    style={{ color: 'var(--cs-accent)' }}
                  >
                    {formatBytes(tooltip.item.sizeBytes, unitMode)}
                  </span>
                </div>
                <div
                  className="text-[11px] font-mono truncate"
                  style={{ color: 'var(--cs-text-muted)' }}
                >
                  {tooltip.item.path}
                </div>
                <div
                  className="pt-1 border-t flex items-center justify-between text-[11px]"
                  style={{
                    borderColor: 'var(--cs-border-subtle)',
                    color: 'var(--cs-text-secondary)',
                  }}
                >
                  <span>{tooltip.item.category}</span>
                  <span className="font-mono tabular-nums">
                    {formatPercent(tooltip.percentOfCurrent)} of view
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <RiskIndicator risk={tooltip.item.risk} compact />
                  <span
                    className="text-[10.5px]"
                    style={{ color: 'var(--cs-text-muted)' }}
                  >
                    {tooltip.item.children?.length
                      ? 'Click inspect · 2× enter'
                      : 'Click to inspect'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : displayMode === 'tree' ? (
          /* DISPLAY MODE 2: HIERARCHICAL LIST */
          <div className="flex-1 overflow-y-auto">
            {renderTreeRows(
              searchQuery ? activeItems : currentFolder.children ?? []
            )}
          </div>
        ) : (
          /* DISPLAY MODE 3: DETAILED TABLE */
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr
                  className="border-b text-[11px]"
                  style={{
                    backgroundColor: 'var(--cs-sidebar)',
                    borderColor: 'var(--cs-border)',
                    color: 'var(--cs-text-muted)',
                  }}
                >
                  <th className="py-2.5 px-4 font-medium">Name & Path</th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Last Modified</th>
                  <th className="py-2.5 px-3 font-medium">Risk</th>
                  <th className="py-2.5 px-4 font-medium text-right">Size</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--cs-border-subtle)' }}
              >
                {activeItems.map((item) => {
                  const hasChildren = Boolean(
                    item.children && item.children.length > 0
                  );
                  const isSelected = selectedItemId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onInspectItem(item)}
                      onDoubleClick={() =>
                        hasChildren && onFocusDirectory(item.id)
                      }
                      className="transition-colors hover:bg-[var(--cs-surface-hover)] cursor-pointer"
                      style={{
                        borderColor: 'var(--cs-border-subtle)',
                        backgroundColor: isSelected
                          ? 'var(--cs-surface-elevated)'
                          : 'transparent',
                      }}
                    >
                      <td className="py-2.5 px-4 max-w-[300px]">
                        <div className="flex items-center gap-2">
                          {hasChildren ? (
                            <Folder
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color: CATEGORY_COLOR_MAP[item.category].hex,
                              }}
                            />
                          ) : (
                            <FileCode
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color: CATEGORY_COLOR_MAP[item.category].hex,
                              }}
                            />
                          )}
                          <span
                            className="font-medium truncate"
                            style={{ color: 'var(--cs-text)' }}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div
                          className="text-[11px] font-mono truncate mt-0.5 pl-5.5"
                          style={{ color: 'var(--cs-text-muted)' }}
                        >
                          {item.path}
                        </div>
                      </td>
                      <td
                        className="py-2.5 px-3 whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {item.fileTypeLabel}
                      </td>
                      <td
                        className="py-2.5 px-3 whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {item.category}
                      </td>
                      <td
                        className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text-secondary)' }}
                      >
                        {formatShortDate(item.lastModified)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <RiskIndicator risk={item.risk} compact />
                      </td>
                      <td
                        className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--cs-text)' }}
                      >
                        {formatBytes(item.sizeBytes, unitMode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Color Legend & Hint Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          {Object.values(StorageCategory).map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{ color: 'var(--cs-text-secondary)' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: CATEGORY_COLOR_MAP[cat].hex }}
              />
              <span>{cat}</span>
            </span>
          ))}
        </div>
        <span style={{ color: 'var(--cs-text-muted)' }}>
          Single-click to inspect metadata · Double-click folder to drill down
        </span>
      </div>
    </div>
  );
}
