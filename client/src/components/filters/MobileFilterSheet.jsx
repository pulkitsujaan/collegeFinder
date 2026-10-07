import Sheet from '../ui/Sheet.jsx';
import Button from '../ui/Button.jsx';
import FilterPanel from './FilterPanel.jsx';
import { formatCount } from '../../lib/format.js';

/**
 * The mobile filter panel: a bottom sheet with a live result count and an
 * explicit Apply. Filters are applied to the URL as they are tapped, so the
 * count is real and closing the sheet is never destructive — Apply is a
 * courtesy exit, not the moment the search happens.
 */
export default function MobileFilterSheet({
  open,
  onClose,
  filters,
  actions,
  meta,
  facets,
  total,
  isLoading,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      labelId="filter-sheet-title"
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ink-soft">
            {isLoading ? 'Counting…' : formatCount(total ?? 0, 'college')}
          </p>
          <div className="flex items-center gap-2">
            {actions.activeCount > 0 && (
              <Button variant="quiet" size="sm" onClick={actions.clearAll}>
                Clear {actions.activeCount}
              </Button>
            )}
            <Button variant="solid" size="sm" onClick={onClose}>
              Show results
            </Button>
          </div>
        </div>
      }
    >
      <FilterPanel filters={filters} actions={actions} meta={meta} facets={facets} />
    </Sheet>
  );
}
