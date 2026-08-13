import { apiRequest } from "../../shared/api/client";
import type { ModelCatalog } from "./types";

export const modelsApi = {
  catalog: (signal?: AbortSignal) =>
    apiRequest<ModelCatalog>("/models", { signal }),
};
