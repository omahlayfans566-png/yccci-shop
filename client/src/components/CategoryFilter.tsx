import type { Category } from '../types';

interface Props {
  categories: Category[];
  selected: string; // category id or "all"
  onSelect: (value: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: Props) {
  const items = [{ _id: 'all', name: 'All', slug: 'all' }, ...categories];

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((cat) => {
        const active = selected === cat._id;
        return (
          <button
            key={cat._id}
            type="button"
            onClick={() => onSelect(cat._id)}
            className={
              active
                ? 'btn-primary min-h-10 shrink-0 px-4 py-2 text-sm'
                : 'btn-outline min-h-10 shrink-0 bg-white px-4 py-2 text-sm'
            }
            aria-pressed={active}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}