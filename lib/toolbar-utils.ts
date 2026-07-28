export type FilterOption = { value: string; label: string };

export type FilterSpec = {
  name: string; // query-string key
  label: string; // human label
  value: string | null; // currently selected value (null = none)
  options: FilterOption[];
  placeholder?: string;
};

export function toForwardParams(
  searchName: string,
  searchValue: string | null,
  filters: FilterSpec[],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (searchValue) out[searchName] = searchValue;
  for (const f of filters) {
    if (f.value) out[f.name] = f.value;
  }
  return out;
}
