export type CharGenCategory = string;

export type CharGenAsset = {
  key: string;
  category: CharGenCategory;
  name: string;
  url: string;
};

export type CharGenSelection = Partial<Record<CharGenCategory, string | null>>;

export type CharGenComposeOptions = {
  layerOrder?: CharGenCategory[];
};

export type CharGenRandomOptions = {
  categories?: CharGenCategory[];
  allowNone?: boolean;
  overrides?: CharGenSelection;
};
