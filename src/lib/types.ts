export type FieldType = 'number' | 'text' | 'duration' | 'boolean' | 'longtext';
/** Stored value: numbers and durations (seconds) as numbers, yes/no as boolean. */
export type FieldValue = number | string | boolean | null;
/** Value while editing: numbers are kept as strings so partial input like "18." works. */
export type InputValue = string | number | boolean | null;

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  unit: string;
}
export interface RecipeField extends FieldDef {
  value: FieldValue;
}
export interface Coffee {
  id: string;
  name: string;
  roaster: string;
  origin: string;
  roastDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface Brewer {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface Recipe {
  id: string;
  brewerId: string;
  name: string;
  description: string;
  instructions: string;
  fields: RecipeField[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface BrewSnapshot {
  recipeName: string;
  brewerName: string;
  coffeeName: string;
  fields: RecipeField[];
}
export interface Brew {
  id: string;
  coffeeId: string;
  recipeId: string;
  brewedAt: string;
  values: Record<string, FieldValue>;
  extraFields: FieldDef[];
  snapshot: BrewSnapshot;
  feedback: string;
  nextTime: string;
  createdAt: string;
  updatedAt: string;
}
export interface AppData {
  coffees: Coffee[];
  brewers: Brewer[];
  recipes: Recipe[];
  brews: Brew[];
}
export type LibraryKind = 'coffees' | 'brewers' | 'recipes';
export interface Selection {
  coffeeId: string;
  brewerId: string;
  recipeId: string;
}
export interface Profile {
  username: string;
  email: string;
}

export interface BrewDraft {
  id: string;
  isNew: boolean;
  fromBrew?: boolean;
  coffeeId: string;
  recipeId: string;
  brewedAt: string;
  snapshot: BrewSnapshot;
  values: Record<string, InputValue>;
  extraFields: FieldDef[];
  feedback: string;
  nextTime: string;
  createdAt?: string;
}
export interface EditableField extends FieldDef {
  value: InputValue;
}
export interface RecipeDraft {
  name: string;
  brewerId: string;
  description: string;
  instructions: string;
  fields: EditableField[];
}
