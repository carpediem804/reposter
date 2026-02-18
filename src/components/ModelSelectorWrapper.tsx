"use client";
import React from "react";
import ModelSelector from "./ModelSelector";
import { useUIStore } from "@/store/ui.store";

export default function ModelSelectorWrapper() {
  const { selectedModel, setSelectedModel } = useUIStore();

  return (
    <div>
      <ModelSelector
        onModelSelectAction={setSelectedModel}
        selectedModel={selectedModel}
        isSimple={true}
      />
      {selectedModel && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            선택된 모델: {selectedModel.name}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {selectedModel.provider}
          </div>
        </div>
      )}
    </div>
  );
}
