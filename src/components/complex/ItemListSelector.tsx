import { ReactNode } from 'react';

// Generic ItemList for selection (used in Team Formation)
interface ItemListSelectorProps<T> {
  items: T[];
  selectedItems: T[];
  onSelectItem: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  itemKey: keyof T;
  maxHeight?: string;
}

export const ItemListSelector = <T extends Record<string, any>>({ 
  items, 
  selectedItems, 
  onSelectItem, 
  renderItem, 
  itemKey, 
  maxHeight = 'max-h-60' 
}: ItemListSelectorProps<T>) => {
  return (
    <div className={`space-y-2 ${maxHeight} overflow-y-auto p-2 border border-neutral-300 rounded-md`}>
      {items.map(item => {
        const isSelected = selectedItems.some(selItem => selItem[itemKey] === item[itemKey]);
        return (
          <div 
            key={item[itemKey] as string} 
            onClick={() => onSelectItem(item)}
            className={`p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary-light text-primary-dark font-semibold' : 'hover:bg-neutral-100'}`}
          >
            {renderItem(item, isSelected)}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-xs text-neutral-500 text-center py-2">선택 가능한 항목이 없습니다.</p>}
    </div>
  );
}; 