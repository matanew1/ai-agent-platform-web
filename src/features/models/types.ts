type ModelOption = {
  id: string;
  label: string;
};

type TemperatureRange = {
  min: number;
  max: number;
  step: number;
  default: number;
};

export type ModelCatalog = {
  provider: string;
  default_model: string;
  models: ModelOption[];
  temperature: TemperatureRange;
};
