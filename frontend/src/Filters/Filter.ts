import ModelBase from 'App/ModelBase';

export interface FilterBuilderPropOption {
  id: string;
  name: string;
}

export interface FilterBuilderProp<T> {
  name: string;
  label: string | (() => string);
  type: string;
  valueType?: string;
  optionsSelector?: (items: T[]) => FilterBuilderPropOption[];
}

export interface PropertyFilter {
  key: string;
  value: boolean | string | number | string[] | number[];
  type: string;
}

export interface Filter {
  key: string | number;
  label: string | (() => string);
  filters: PropertyFilter[];
}

// Readarr v1 CustomFilterResource.
export interface CustomFilter extends ModelBase {
  type: string;
  label: string;
  filters: PropertyFilter[];
}
