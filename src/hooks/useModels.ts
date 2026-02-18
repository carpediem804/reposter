"use client";
import { useQuery } from "@tanstack/react-query";
import { modelQueryOptions } from "@/store-query/model.queryOptions";

export function useFreeModels() {
  return useQuery(modelQueryOptions.free());
}

export function usePaidModels() {
  return useQuery(modelQueryOptions.paid());
}

export function useUserDefaultModel() {
  return useQuery(modelQueryOptions.userDefault());
}

export function useModelById(id?: string) {
  return useQuery(id ? modelQueryOptions.byId(id) : { queryKey: ["models", "byId", "none"], queryFn: async () => null });
}


